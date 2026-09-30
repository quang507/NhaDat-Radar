-- 031 (30/9/2026): SỰ KIỆN QUAN TÂM - ghi lại ai đang để ý phòng nào. Chạy lại được.
--
-- Trước đây chỉ form liên hệ (bảng leads) được lưu; bấm Gọi / Zalo / quét QR / lưu ♥ / chia sẻ / hỏi bot
-- đều mất dấu -> không biết phòng nào đang "nóng" để đẩy bài FB, bot trả lời hụt câu gì.
--
-- Chỉ lưu mã khách ẨN DANH (uuid ngẫu nhiên trong localStorage) - không IP, không SĐT, không danh tính.
-- Ghi qua /api/su-kien bằng service_role (có giới hạn tần suất theo IP) -> KHÔNG mở quyền insert cho anon;
-- chỉ admin đọc.
create table if not exists public.su_kien (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  loai        text not null check (loai in ('xem', 'goi', 'zalo', 'chia_se', 'luu', 'dat_lich', 'chat')),
  listing_id  uuid references public.listings(id) on delete cascade,
  khach       text check (khach is null or length(khach) <= 40),    -- mã ẩn danh trình duyệt
  noi_dung    text check (noi_dung is null or length(noi_dung) <= 500), -- câu hỏi bot (loai='chat')
  ket_qua     int                                                     -- số tin bot tìm được
);
create index if not exists su_kien_listing_idx on public.su_kien (listing_id, created_at desc);
create index if not exists su_kien_loai_idx on public.su_kien (loai, created_at desc);

alter table public.su_kien enable row level security;
drop policy if exists "su_kien_admin_read" on public.su_kien;
create policy "su_kien_admin_read" on public.su_kien for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
revoke all on public.su_kien from anon;
