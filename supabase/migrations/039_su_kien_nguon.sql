-- 039 (3/11/2026): su_kien thêm NGUỒN TRUY CẬP + LOẠI THIẾT BỊ (UX audit #16). Chạy lại được, chạy lúc nào cũng được:
-- bản web mới tự ghi lại không có 2 cột này nếu migration chưa chạy (lib/su-kien.ts), không mất sự kiện.
--
-- nguon: utm_source hoặc tên miền trang dẫn tới (google.com, facebook.com, zalo.me...), "truc_tiep" khi không có
--        referrer. Chỉ tên miền, không lưu đường dẫn đầy đủ / từ khoá tìm kiếm.
-- thiet_bi: theo bề rộng màn hình lúc ghi - dt (< 768px), tablet (< 1024px), pc.
-- Phiên admin không còn được ghi (api/su-kien bỏ qua), nên số liệu từ 3/11 không lẫn lượt xem của đội Radar.
alter table public.su_kien add column if not exists nguon text check (nguon is null or length(nguon) <= 40);
alter table public.su_kien add column if not exists thiet_bi text check (thiet_bi is null or thiet_bi in ('dt', 'tablet', 'pc'));
create index if not exists su_kien_nguon_idx on public.su_kien (nguon, created_at desc);
