-- 024: Dọn dẹp tin crawl tồn đọng quá hạn để giải phóng dung lượng DB (ngăn chặn chạm trần 500MB Supabase)
-- Tin người dùng tự đăng (source != 'crawl': agent, user, zalo_oa, zalo_miniapp) KHÔNG BAO GIỜ bị ảnh hưởng.

-- 1. Chuyển sang 'gone' các tin crawl không thấy lại trên nguồn quá 7 ngày
update listings
set status = 'gone'
where source = 'crawl'
  and status = 'published'
  and last_seen_at < now() - interval '7 days';

-- 2. Xoá vĩnh viễn các tin crawl quá 21 ngày không thấy lại
delete from listings
where source = 'crawl'
  and last_seen_at < now() - interval '21 days';

-- 3. Giải phóng embedding vector(768) cho các tin đã 'gone' (tin gone không lên search nên không cần vector trong RAM/HNSW)
update listings
set embedding = null
where status = 'gone'
  and embedding is not null;

-- 4. Dọn lịch sử giá quá 180 ngày
delete from price_history
where day < (current_date - interval '180 days')::date;
