-- ============================================================================
-- 032 — SĂN KHÁCH TÌM PHÒNG (2/10/2026)
-- Bài khách đăng "cần tìm phòng" trên nhóm Facebook (crawler/facebook.mjs -> crawler/san-khach.mjs),
-- nhân viên xử lý ở /admin?tab=san-khach. Bảng riêng thay vì buyers (025 chưa từng được áp lên DB thật).
-- Chỉ service role (crawler + trang admin dùng createAdminClient) đọc/ghi: có tên/SĐT người đăng.
-- ============================================================================
create table if not exists public.khach_tim (
  id         uuid primary key default gen_random_uuid(),
  nguon      text not null default 'facebook',
  url        text,
  khoa       text not null unique,          -- link bài, hoặc 120 ký tự đầu nội dung khi không có link -> chống trùng
  ten        text,
  sdt        text,
  noi_dung   text check (noi_dung is null or length(noi_dung) <= 2000),
  nhu_cau    jsonb not null default '{}'::jsonb,   -- quan[], gia_tu, gia_den, loai_phong, so_nguoi, ngay_vao, yeu_cau[], tom_tat
  dang_luc   timestamptz,
  xu_ly      text check (xu_ly in ('da_nhan', 'bo_qua')),
  xu_ly_luc  timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists khach_tim_moi_idx on public.khach_tim (created_at desc);
alter table public.khach_tim enable row level security;   -- không policy nào -> anon/authenticated không đọc được
revoke all on public.khach_tim from anon, authenticated;
