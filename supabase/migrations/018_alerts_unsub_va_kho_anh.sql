-- 018 (21/8): token hủy đăng ký email (link trong footer mail phải có thật - trước giờ mail
-- hứa "hủy được ngay trong email" mà không có nút) + bucket công khai chứa ảnh tin Zalo
-- (link CDN Zalo có hạn, chết là tin trắng ảnh - tải về kho nhà cho bền).
-- Hủy = set active=false chứ KHÔNG xoá hàng: còn xem và quản lý được trong Supabase.
alter table saved_searches add column if not exists unsub_token uuid not null default gen_random_uuid();
insert into storage.buckets (id, name, public) values ('anh-zalo', 'anh-zalo', true)
on conflict (id) do nothing;
