-- 047 (19/11/2026): cay khu vuc doc tu bang cache, lam moi bang pg_cron moi 30 phut.
--
-- Audit 24 gio (Supabase logs + pg_stat_statements 18/11):
--   rpc cay_khu_vuc bi may chu Vercel goi ~390 lan/ngay (10-35 lan moi gio, ca dem), moi lan 3-5 giay (max 123 giay),
--   tong 25.612 giay thoi gian CSDL = 98% cua ca project (truy van thu hai chi 219 giay), moi lan tra ~75 KB (~30 MB egress/ngay).
--   Ham quet 4 lan toan bo ~24.000 tin published (group by / distinct / count); luc DB ranh chi mat 232 ms nhung khi
--   nhieu luot chay chong len nhau thi xep hang 3-5 giay, keo theo timeout 3s cua anon o cac truy van khac.
-- Cach sua: tinh san vao bang 1 dong, ham cay_khu_vuc() chi doc dong do (~1 ms). Chu ky ham + quyen (chi service_role)
--   khong doi nen lib/geo.ts khong phai sua. Do tre toi da 30 phut la chap nhan duoc (Next da cache 6 gio).
--
-- Idempotent (chay lai duoc). Hoan tac: select cron.unschedule('lam-moi-cay-khu-vuc'); drop function public.cay_khu_vuc();
--   alter function public.tinh_cay_khu_vuc() rename to cay_khu_vuc; drop function public.lam_moi_cay_khu_vuc();
--   drop table public.cay_khu_vuc_cache;

create extension if not exists pg_cron;

create table if not exists public.cay_khu_vuc_cache (
  id integer primary key default 1 check (id = 1),
  data jsonb not null,
  cap_nhat timestamptz not null default now()
);
alter table public.cay_khu_vuc_cache enable row level security;   -- khong policy: chi service_role / ham security definer doc duoc

-- Than ham nang cu giu nguyen, doi ten. Chi chay duoc tu lam_moi_cay_khu_vuc() va pg_cron.
do $$
begin
  if to_regprocedure('public.tinh_cay_khu_vuc()') is null then
    alter function public.cay_khu_vuc() rename to tinh_cay_khu_vuc;
  end if;
end $$;
revoke execute on function public.tinh_cay_khu_vuc() from public, anon, authenticated;

create or replace function public.lam_moi_cay_khu_vuc()
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  insert into public.cay_khu_vuc_cache (id, data, cap_nhat)
  values (1, public.tinh_cay_khu_vuc(), now())
  on conflict (id) do update set data = excluded.data, cap_nhat = excluded.cap_nhat;
end
$fn$;
revoke execute on function public.lam_moi_cay_khu_vuc() from public, anon, authenticated;

-- Ham duoc goi qua PostgREST (rpc/cay_khu_vuc): doc bang cache; bang chua co du lieu (lan dau) thi tinh truc tiep.
drop function if exists public.cay_khu_vuc();
create function public.cay_khu_vuc()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  d jsonb;
begin
  select data into d from public.cay_khu_vuc_cache where id = 1;
  if d is null then
    d := public.tinh_cay_khu_vuc();
  end if;
  return d;
end
$fn$;
revoke execute on function public.cay_khu_vuc() from public, anon, authenticated;
grant execute on function public.cay_khu_vuc() to service_role;

select public.lam_moi_cay_khu_vuc();

-- Lich lam moi: phut 7 va 37 (tranh dung gio tron/gio ruoi, luc cac crawler ro hang va daily ghi du lieu).
select cron.unschedule('lam-moi-cay-khu-vuc') where exists (select 1 from cron.job where jobname = 'lam-moi-cay-khu-vuc');
select cron.schedule(
  'lam-moi-cay-khu-vuc',
  '7,37 * * * *',
  $job$select public.lam_moi_cay_khu_vuc()$job$
);
