-- 013: thông số dự án + link nguồn (2026-08-17)
-- Crawler mogi-projects.mjs bóc được bảng thông số (tổng diện tích, diện tích xây dựng, ngày khởi
-- công/hoàn thành, pháp lý, diện tích căn từ-đến) nhưng bảng projects không có chỗ chứa -> mất sạch,
-- trang dự án chỉ còn 1 khối mô tả dài. Thêm jsonb để giữ nguyên cặp nhãn/giá trị của nguồn
-- (mỗi dự án có bộ chỉ tiêu khác nhau, không gò được thành cột cố định).
alter table projects add column if not exists specs jsonb not null default '{}'::jsonb;
alter table projects add column if not exists handover text;      -- "Bàn giao: 2020" ở trang danh sách
alter table projects add column if not exists source_url text;    -- link trang gốc trên nguồn
alter table projects add column if not exists price_per_m2_text text; -- "65 - 68 triệu/m²" (khoảng đơn giá)
