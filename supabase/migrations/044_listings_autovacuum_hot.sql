-- 044 (17/11/2026): bang listings bi "ban" sau moi luot cao -> phep dem cua /search cham, anon timeout 3s (57014).
--
-- Do duoc (17/11, EXPLAIN ANALYZE dem tin thue HCM):
--   Index Only Scan idx_listings_pub_prov_deal_src_seen, 16.572 dong nhung Heap Fetches = 12.122,
--   Buffers shared hit = 7.066 (~55 MB), 3.117 ms du KHONG doc dia. Khi bang "sach" chi can vai chuc trang.
--   pg_stat_user_tables: 317.106 luot update, chi 34.555 la HOT (11%), 4.438 dong chet.
--
-- Vi sao: crawler/daily.mjs (6 luot/ngay) upsert lai MOI tin thay lai, lan nao cung doi last_seen_at.
--   last_seen_at co index (idx_listings_last_seen) -> update khong the HOT -> moi update ghi them vao
--   ca 24 index (ke ca HNSW embedding va GIN trgm) va xoa co "all-visible" cua trang.
--   Autovacuum mac dinh cho 20% dong chet (~6.300 dong) moi chay -> giua hai lan vacuum, index-only scan
--   phai mo heap cho gan het cac dong. Cac migration 040/042/043 them index la chua trung goc.
--
-- Sua:
--   1. Bo idx_listings_last_seen: chi crawler/daily.mjs va crawler/db-prune.mjs loc theo last_seen_at
--      (service_role, timeout 120s, vai lan/ngay; quet 66 MB heap la du nhanh). Bo roi thi update chi doi
--      last_seen_at/crawled_at/crawl_count thanh HOT, khong dung toi index nao.
--   2. Autovacuum rieng cho bang nay: chay khi ~2% dong chet (thay vi 20%) -> co all-visible duoc dat lai
--      ngay sau moi luot cao, phep dem quay ve index-only that su.
--   3. fillfactor 85: chua 15% moi trang cho ban moi cua dong (dieu kien de update HOT). Chi ap cho trang
--      ghi moi; trang cu tu co cho sau khi vacuum don dong chet.
--
-- Idempotent (chay lai duoc). Hoan tac: reset 4 tham so duoi + tao lai index
--   create index if not exists idx_listings_last_seen on public.listings(last_seen_at);

alter table public.listings set (
  autovacuum_vacuum_scale_factor = 0.02,
  autovacuum_vacuum_threshold = 200,
  autovacuum_analyze_scale_factor = 0.05,
  fillfactor = 85
);

drop index if exists public.idx_listings_last_seen;

-- SAU KHI chay file nay, chay RIENG mot lenh (VACUUM khong chay chung giao dich voi lenh khac):
--   vacuum (analyze) public.listings;
