-- 049 (21/11/2026): danh sách /search (mua bán HCM, cho thuê HCM...) quá hạn 3 s của anon -> trang trống "0 bất động sản".
--
-- Nguyên nhân (EXPLAIN ANALYZE với set local role anon): có RLS thì điều kiện trên cột enum (deal = 'ban': enum_eq không
-- leakproof) KHÔNG được dùng làm điều kiện index, nên các index (province, deal, first_seen_at...) chỉ dùng được phần
-- "province"; Postgres đọc ~5.000 dòng của tỉnh rồi Sort top-N: 850 ms ấm, quá 3 s khi nguội/tải song song.
-- Cách chữa: index sắp theo (province, first_seen_at desc, id) và PHỦ deal/source/status/agent_id. Postgres đọc theo thứ tự
-- thời gian, lọc deal/source ngay trên index và dừng khi đủ LIMIT: 0,9 ms cho truy vấn danh sách 14 tin.
-- Hoàn tác: drop index public.idx_listings_pub_prov_seen_cover;
-- Lưu ý khi sửa nhiều dòng listings hàng loạt (vd cập nhật 1.440 dòng ảnh 21/11): chạy `vacuum (analyze) public.listings`
-- ngay sau đó, nếu không bản ghi chết làm các truy vấn chậm tạm thời và trang tìm kiếm trống.

create index if not exists idx_listings_pub_prov_seen_cover
  on public.listings (province, first_seen_at desc nulls last, id)
  include (deal, source, status, agent_id)
  where status = 'published';

analyze public.listings;
