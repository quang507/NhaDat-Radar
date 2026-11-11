-- 040: partial B-tree index cho truy vấn hộp tọa độ (trang điểm neo /phong-tro-gan/[diem] và lọc bản đồ).
-- pg_indexes trước đó chỉ có idx_listings_geo USING gist (geo), trong khi query lọc bằng deal + lat/lng range.
create index if not exists idx_listings_pub_geo_box
  on public.listings (deal, lat, lng)
  where status = 'published' and lat is not null and lng is not null;
