-- ============================================================================
--  MIGRATION 003 - Upload ảnh + Lịch sử giá + pgvector (2026-08-14)
--  Chạy trong Supabase -> SQL Editor -> dán -> Run. An toàn chạy lại nhiều lần.
-- ============================================================================

-- ---------- 1. STORAGE: bucket 'uploads' cho ảnh tin đăng + avatar ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('uploads', 'uploads', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 5242880;

-- Ai cũng xem được (bucket public); user đăng nhập chỉ ghi/xoá trong thư mục của MÌNH (uploads/<uid>/...)
drop policy if exists "uploads_public_read" on storage.objects;
create policy "uploads_public_read" on storage.objects for select
  using (bucket_id = 'uploads');
drop policy if exists "uploads_insert_own" on storage.objects;
create policy "uploads_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "uploads_delete_own" on storage.objects;
create policy "uploads_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- 2. LỊCH SỬ GIÁ: snapshot giá/m² trung vị theo khu vực mỗi ngày ----------
create table if not exists price_history (
  day          date not null,
  province     text not null,
  district     text not null default '',
  kind         text not null,
  deal         text not null,
  median_ppm2  bigint not null,
  n            int not null,
  primary key (day, province, district, kind, deal)
);
alter table price_history enable row level security;
drop policy if exists "ph_read" on price_history;
create policy "ph_read" on price_history for select using (true);
-- Ghi bằng service_role (crawler/price-history.mjs) - bỏ qua RLS.

-- ---------- 3. PGVECTOR: nền móng tìm kiếm ngữ nghĩa ----------
create extension if not exists vector;
alter table listings add column if not exists embedding vector(768);
create index if not exists idx_listings_embedding on listings
  using hnsw (embedding vector_cosine_ops);

create or replace function match_listings(query_embedding vector(768), match_count int default 8)
returns table (id uuid, similarity float)
language sql stable as $$
  select l.id, 1 - (l.embedding <=> query_embedding) as similarity
  from listings l
  where l.status = 'published' and l.embedding is not null
  order by l.embedding <=> query_embedding
  limit match_count;
$$;
