-- 034 (3/10): index cho lọc tin công khai theo tỉnh/quận/loại (/search, trang khu vực, tin liên quan).
-- Trước đây không có index nào trên province/district/kind -> mỗi đếm HEAD quét cả bảng.
create index if not exists idx_listings_pub_loc
  on public.listings (province, district, deal, kind) where status = 'published';
create index if not exists idx_listings_pub_deal_first_seen
  on public.listings (deal, first_seen_at desc) where status = 'published';
