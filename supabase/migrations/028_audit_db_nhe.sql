-- 028 (22/9/2026): các phát hiện mức thấp–trung bình của audit DB. Chạy lại được; tương thích code cũ lẫn mới.
-- Kiểm chứng trên DB dựng sạch (supabase/postgres 17.6.1.155) bằng db-audit-tests/rls_tests.sql.

-- 1. Storage uploads: bỏ quyền LIỆT KÊ công khai. Bucket public vẫn phục vụ file qua URL /object/public/...
--    không cần policy SELECT; policy cũ cho anon liệt kê mọi object (lộ danh sách user id có upload).
--    Giữ SELECT cho chủ folder (storage-api cần SELECT khi xoá/ghi đè file của chính mình).
drop policy if exists "uploads_public_read" on storage.objects;
drop policy if exists "uploads_select_own" on storage.objects;
create policy "uploads_select_own" on storage.objects for select to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);

-- 2. projects: trước đây MỌI agent sửa/xoá được MỌI dự án (kể cả priority/is_partner). Web/crawler ghi
--    dự án bằng service_role, không có luồng agent sửa dự án -> chỉ admin.
drop policy if exists "projects_write" on public.projects;
create policy "projects_write" on public.projects for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- 3. Quyền mặc định thừa của Supabase: TRUNCATE (không chịu RLS), TRIGGER, REFERENCES cho anon/authenticated.
--    PostgREST không expose các lệnh này, nhưng không có lý do để giữ.
revoke truncate, trigger, references on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke truncate, trigger, references on tables from anon, authenticated;

-- 4. Hàm SECURITY DEFINER của PostGIS không đặt search_path, anon gọi được qua RPC (advisor WARN). App không dùng.
do $$
declare f regprocedure;
begin
  for f in select p.oid::regprocedure from pg_proc p
           where p.pronamespace = 'public'::regnamespace and p.proname = 'st_estimatedextent' loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
  end loop;
exception when others then
  raise notice 'Bỏ qua st_estimatedextent: %', sqlerrm;
end $$;

-- 5. Index cho khoá ngoại (xoá cha không phải quét tuần tự; RLS subquery của messages/leads dùng các cột này)
create index if not exists idx_listings_project      on public.listings (project_id) where project_id is not null;
create index if not exists idx_favorites_listing     on public.favorites (listing_id);
create index if not exists idx_conversations_buyer   on public.conversations (buyer_id);
create index if not exists idx_conversations_agent   on public.conversations (agent_id);
create index if not exists idx_messages_sender       on public.messages (sender_id);
create index if not exists idx_appointments_listing  on public.appointments (listing_id);
create index if not exists idx_leads_listing         on public.leads (listing_id);
create index if not exists idx_leads_chua_bao        on public.leads (created_at) where notified_at is null;
create index if not exists idx_leads_project         on public.leads (project_id) where project_id is not null;
create index if not exists idx_saved_searches_user   on public.saved_searches (user_id);
create index if not exists idx_reports_reporter      on public.listing_reports (reporter_id) where reporter_id is not null;
create index if not exists idx_info_requests_listing on public.info_requests (listing_id);
create index if not exists idx_listing_facts_listing on public.listing_facts (listing_id);

-- 6. Index trùng: idx_listings_source_post (008) trùng partial unique uq_listings_source_post (001)
drop index if exists public.idx_listings_source_post;

-- 7. CHECK cho trạng thái lịch hẹn (giá trị web dùng: dashboard/actions.ts setAppointmentStatus)
alter table public.appointments drop constraint if exists appointments_status_check;
alter table public.appointments add constraint appointments_status_check
  check (status in ('requested', 'confirmed', 'cancelled')) not valid;
