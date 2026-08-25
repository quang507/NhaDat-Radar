-- 023 (25/8): F2 "còn bán không" - bot hỏi lại người bán tin ĐĂNG QUA ZALO sau 7 ngày để
-- lọc tin ma. last_confirmed_at = lần cuối chốt "còn bán"; null hoặc quá 7 ngày -> hỏi lại.
alter table listings add column if not exists last_confirmed_at timestamptz;
