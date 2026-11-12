-- 043 (12/11/2026): Index cho truy van Tin tuong tu (tuong-tu.ts & listings/[id]/page.tsx)
-- Nguyen nhan: Postgres Logs ngay 12/11 ghi nhan hang chuc loi statement timeout 3s (anon)
-- o truy van ORDER BY ai_score DESC NULLS LAST theo tinh/quan.
-- Idempotent (chay lai duoc).

create index if not exists idx_listings_pub_dist_deal_ai
  on public.listings (district, deal, ai_score desc nulls last, price_vnd)
  where status = 'published' and images <> '{}'::text[];

create index if not exists idx_listings_pub_dist_kind_ai
  on public.listings (district, kind, ai_score desc nulls last, source)
  where status = 'published' and images <> '{}'::text[];
