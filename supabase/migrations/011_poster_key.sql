-- 011: định danh người đăng (không phải dữ liệu cá nhân: id tài khoản trên nguồn hoặc hash SĐT)
-- -> "Người đăng này có N tin khác" (kiểu hồ sơ môi giới batdongsan) + tín hiệu môi giới chính xác hơn.
alter table listings add column if not exists poster_key text;
create index if not exists idx_listings_poster_key on listings(poster_key) where poster_key is not null;
