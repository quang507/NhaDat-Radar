-- 048 (21/11/2026): đếm tổng ở /search chậm 1,5-4 s với khách ẩn danh, quá hạn 3 s của anon -> HTTP 500
-- (PostgREST HEAD không có thân phản hồi nên log chỉ thấy "{ message: '' }"), trang tìm kiếm trống từng lượt.
--
-- Nguyên nhân (EXPLAIN ANALYZE với set local role anon):
--   - chính sách listings_read_public cần các cột status, source, agent_id (+ bảng profiles) cho mỗi dòng;
--   - có RLS thì điều kiện trên cột kiểu enum (deal = 'cho_thue': enum_eq không leakproof) KHÔNG được đẩy vào index,
--     nên Postgres đọc hết ~19.300 dòng của tỉnh rồi lọc deal từng dòng, mỗi dòng còn phải đọc heap (agent_id/source
--     không nằm trong index): 18.735 buffer, 1,5-4,0 s. Cùng truy vấn bằng quyền postgres (không RLS) chỉ 0,5 s.
-- Cách chữa: index PHỦ (INCLUDE status, source, agent_id) để quét index-only, đủ cột cho cả điều kiện RLS lẫn deal.
-- Thử trong giao dịch rồi hoàn tác: 216 ms (index mới, chưa ấm) so với 1.492-4.032 ms.
-- Hoàn tác: drop index public.idx_listings_pub_loc_cover;

create index if not exists idx_listings_pub_loc_cover
  on public.listings (province, deal, first_seen_at desc nulls last, id)
  include (status, source, agent_id)
  where status = 'published';

analyze public.listings;
