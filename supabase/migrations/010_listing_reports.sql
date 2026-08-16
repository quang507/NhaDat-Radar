-- 010: báo tin xấu (kiểu "Báo cáo vi phạm" của batdongsan). Ai cũng gửi được; admin đọc/xử lý ở /admin?tab=reports.
create table if not exists listing_reports (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references listings(id) on delete cascade,
  reason      text not null check (reason in ('da_ban','sai_gia','sai_dia_chi','gia_chinh_chu','lua_dao','trung_lap','khac')),
  detail      text,
  reporter_id uuid references profiles(id) on delete set null,   -- null nếu khách vãng lai
  status      text not null default 'new' check (status in ('new','resolved','ignored')),
  created_at  timestamptz not null default now()
);
create index if not exists idx_reports_listing on listing_reports(listing_id, status);
create index if not exists idx_reports_status  on listing_reports(status, created_at desc);
alter table listing_reports enable row level security;
create policy "reports_insert_anyone" on listing_reports for insert with check (true);
create policy "reports_read_admin" on listing_reports for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);
-- update/delete: chỉ service role (admin action) — không mở policy cho client.
