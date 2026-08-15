-- 007 — Bảng cấu hình nội bộ (lưu Zalo refresh_token xoay vòng...).
-- RLS bật + KHÔNG có policy: client thường bị chặn hoàn toàn, chỉ service_role đọc/ghi.
create table if not exists app_config (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
alter table app_config enable row level security;
