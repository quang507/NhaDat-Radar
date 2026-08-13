-- ============================================================================
--  MIGRATION 001 - Vá lỗi bảo mật từ audit (2026-08-13)
--  Chạy 1 lần trong Supabase -> SQL Editor -> New snippet -> dán -> Run.
--  An toàn chạy lại nhiều lần (idempotent).
-- ============================================================================

-- #1 CRITICAL: trigger tạo profile KHÔNG được đọc 'role' từ metadata do client kiểm soát
--    (nếu không, kẻ tấn công signUp với data:{role:"admin"} bằng anon key -> tự thành admin)
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), 'user');  -- LUÔN 'user'
  return new;
end $$;

-- #2 + #14 CRITICAL/HIGH: chặn user tự đổi cột nhạy cảm qua PostgREST
--    (RLS là row-level; dùng GRANT cột để chặn ghi cột). service_role KHÔNG bị ảnh hưởng.
revoke update (role, is_verified) on public.profiles from anon, authenticated;
revoke update (source, source_site, ai_score, trust_score, price_flag, agent_id, status)
  on public.listings from anon, authenticated;

-- #10 MEDIUM: ẩn cột cá nhân của profiles khỏi truy cập ẩn danh (SĐT, số giấy phép)
revoke select (phone, license_no) on public.profiles from anon;

-- #4 HIGH: cho phép user đã đăng nhập đăng tin của CHÍNH MÌNH (bỏ ràng buộc role 'agent'
--    vốn làm mọi user thường bị chặn RLS khi bấm "Đăng tin")
drop policy if exists "listings_insert_own_agent" on public.listings;
drop policy if exists "listings_insert_own" on public.listings;
create policy "listings_insert_own" on public.listings for insert
  with check (agent_id = auth.uid() and source = 'agent');

-- #9 MEDIUM: giới hạn độ dài lead (chống flood DB)
alter table public.leads drop constraint if exists leads_len_chk;
alter table public.leads add constraint leads_len_chk check (
  char_length(name) <= 120 and char_length(phone) <= 30
  and char_length(coalesce(message, '')) <= 2000
);

-- #3 HIGH: unique để seed upsert theo (source_site, source_post_id) - phòng khi quay lại upsert
create unique index if not exists uq_listings_source_post
  on public.listings(source_site, source_post_id) where source_post_id is not null;

-- #16: xoá tin rác không phải BĐS đã lỡ crawl (đèn đường, công tắc, thiết bị...)
delete from public.listings
  where source = 'crawl'
    and (title ilike '%đèn đường%' or title ilike '%công tắc%' or title ilike '%thiết bị%'
         or title ilike '%led%' or title ilike '%báo giá%');
