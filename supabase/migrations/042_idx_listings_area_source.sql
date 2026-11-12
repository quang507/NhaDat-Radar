-- 042 (11/11/2026): Index một phần cho AreaLanding & thống kê khu vực (giảm thời gian truy vấn từ ~1,25s xuống ~33ms, tránh timeout 3s anon).
-- Chạy lại được (idempotent). Đã áp trực tiếp lên production DB ngày 11/11/2026.

create index if not exists idx_listings_pub_prov_deal_src_seen
  on public.listings (province, deal, source, first_seen_at desc nulls last)
  where status = 'published';

create index if not exists idx_listings_pub_prov_dist_deal_kind_seen
  on public.listings (province, district, deal, kind, first_seen_at desc nulls last)
  where status = 'published';
