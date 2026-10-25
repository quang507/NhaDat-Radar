-- 035 (26/10/2026): VECTOR cho DỰ ÁN - tìm dự án theo NGHĨA trong chatbot ("chung cư Hà Đô quận 10",
-- "khu đô thị có hồ bơi gần sân bay"), không cần gõ đúng tên. Chạy lại được.
--
-- Vector KHÔNG tính lại: chép từ kho AI Ơi Nhà Đất (cột projects.nhung halfvec(768)), cùng model
-- gemini-embedding-001 768 chiều mà Radar dùng cho listings.embedding (migration 003) -> câu hỏi của khách
-- được nhúng 1 lần ở /api/chat rồi so được với cả tin lẫn dự án.
-- Nạp vector: node --env-file=.env.local scripts/nhap-du-an-aioi.mjs --vector --ghi
create extension if not exists vector;

alter table public.projects add column if not exists embedding vector(768);
create index if not exists idx_projects_embedding on public.projects
  using hnsw (embedding vector_cosine_ops);

-- Cùng kiểu match_listings: trả id + độ giống (1 - khoảng cách cosine); chỉ dự án đang hiển thị
create or replace function public.match_projects(query_embedding vector(768), match_count int default 5)
returns table (id uuid, similarity float)
language sql stable set search_path = public, extensions as $$
  select p.id, 1 - (p.embedding <=> query_embedding) as similarity
  from public.projects p
  where p.embedding is not null and p.status = 'published'
  order by p.embedding <=> query_embedding
  limit least(greatest(match_count, 1), 20);
$$;
grant execute on function public.match_projects(vector, int) to anon, authenticated, service_role;
