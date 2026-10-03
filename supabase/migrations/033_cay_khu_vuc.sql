-- ============================================================================
-- 033 — CÂY KHU VỰC ĐẾM SẴN Ở DB (3/10/2026, egress)
-- lib/geo.ts getAreas() trước đây kéo MỌI tin published (~22.000 dòng, 23 lượt x 1.000 dòng, ~2,6 MB) về
-- server Next rồi mới đếm theo tỉnh/quận/loại. Observability 3/10: 10 truy vấn bị gọi nhiều nhất của cả
-- project đều là lượt kéo này (~30 lần dựng lại/giờ do mỗi bản deploy có cache riêng).
-- Hàm này đếm sẵn trong Postgres, trả 1 jsonb gọn (~100-150 KB):
--   c: [[tỉnh, quận, deal, loại, số tin]...]   w: [[tỉnh, quận, phường]...]   s: [nguồn...]   t: tổng
-- Chỉ service_role gọi (getAreas dùng createAdminClient).
-- ============================================================================
create or replace function public.cay_khu_vuc()
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'c', (select coalesce(jsonb_agg(jsonb_build_array(province, district, deal, kind, n)), '[]'::jsonb)
          from (select province, district, deal, kind, count(*) as n
                from listings where status = 'published' group by 1, 2, 3, 4) x),
    'w', (select coalesce(jsonb_agg(jsonb_build_array(province, district, ward)), '[]'::jsonb)
          from (select distinct province, district, ward
                from listings where status = 'published' and ward is not null and ward <> '') y),
    's', (select coalesce(jsonb_agg(s), '[]'::jsonb)
          from (select distinct case when source = 'crawl' then coalesce(source_site, 'crawl') else source::text end as s
                from listings where status = 'published') z),
    't', (select count(*) from listings where status = 'published')
  );
$$;
revoke execute on function public.cay_khu_vuc() from public, anon, authenticated;
grant execute on function public.cay_khu_vuc() to service_role;
