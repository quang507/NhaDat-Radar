-- 050 (21/11/2026): ghi lại số lượt gọi PostgREST theo NHÓM mỗi giờ để biết egress đến từ đâu.
-- Trang Usage của Supabase chỉ có đơn vị ngày và không chia theo nguồn; pg_stat_statements chỉ có số cộng dồn từ 08/10.
-- Mỗi giờ (pg_cron, phút 05) ghi 1 ảnh chụp: tổng lượt gọi + giây DB theo nhóm lệnh, kèm 30 lệnh gọi nhiều nhất.
-- Đọc theo giờ: select * from public.egress_theo_gio where them_luot > 0 order by ts desc, them_luot desc;
-- Ước egress: lượt gọi x dung lượng nén 1 lượt (danh sách tìm kiếm ~8 KB, chi tiết tin ~13 KB, tin tương tự ~3,5 KB).
-- Không ai ngoài owner đọc được (RLS bật, thu hồi quyền anon/authenticated). Giữ 30 ngày.
-- Hoàn tác: select cron.unschedule('ghi-egress-gio'); drop view public.egress_theo_gio; drop function public.ghi_egress_snapshot();
--           drop table public.egress_snapshot;

create table if not exists public.egress_snapshot (
  ts timestamptz not null default now(),
  nhom text not null,
  luot_goi bigint not null,
  giay_db numeric not null default 0,
  chi_tiet text,
  primary key (ts, nhom)
);
alter table public.egress_snapshot enable row level security;
revoke all on public.egress_snapshot from anon, authenticated;

create or replace function public.ghi_egress_snapshot()
returns void
language plpgsql
security definer
set search_path = public, extensions
as $fn$
declare
  t timestamptz := date_trunc('minute', now());
begin
  insert into public.egress_snapshot (ts, nhom, luot_goi, giay_db)
  select t, nhom, sum(calls), round(sum(total_exec_time) / 1000)
    from (
      select case
        when query ilike '%listing_facts%' then '1 facts (chi tiet tin)'
        when query ilike '%price_history%' then '2 price_history'
        when query ilike '%update "public"."listings"%' then '3 update listings (bot/crawl)'
        when query ilike '%"leads"%' or query ilike '%app_config%' then '4 bot poll'
        when query ilike '%"listings"."id" = $1 limit%' then '5 chi tiet theo id'
        when query ilike '%pgrst_source%' and query ilike '%first_seen_at%' then '6 danh sach (tim kiem, trang chu, khu vuc)'
        when query ilike '%pgrst_source%' and query ilike '%ai_score%' then '7 lien quan / tuong tu'
        when query ilike '%pgrst_source%' then '8 pgrst khac'
        else '9 khong phai pgrst'
      end as nhom, calls, total_exec_time
      from extensions.pg_stat_statements
    ) s
   group by nhom;

  insert into public.egress_snapshot (ts, nhom, luot_goi, giay_db, chi_tiet)
  select t, 'q:' || queryid::text, calls, round(total_exec_time / 1000),
         left(regexp_replace(query, '\s+', ' ', 'g'), 220)
    from extensions.pg_stat_statements
   where query ilike '%pgrst_source%'
   order by calls desc
   limit 30;

  insert into public.egress_snapshot (ts, nhom, luot_goi)
  select t, '_db tup_returned', tup_returned from pg_stat_database where datname = current_database();

  delete from public.egress_snapshot where ts < now() - interval '30 days';
end
$fn$;
revoke all on function public.ghi_egress_snapshot() from public, anon, authenticated;

create or replace view public.egress_theo_gio with (security_invoker = true) as
select ts, nhom, chi_tiet,
       luot_goi - lag(luot_goi) over (partition by nhom order by ts) as them_luot,
       giay_db - lag(giay_db) over (partition by nhom order by ts) as them_giay_db
  from public.egress_snapshot;
revoke all on public.egress_theo_gio from anon, authenticated;

select cron.schedule('ghi-egress-gio', '5 * * * *', 'select public.ghi_egress_snapshot()');
select public.ghi_egress_snapshot();
