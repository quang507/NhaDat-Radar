-- ========================================================
-- NhaDat-Radar FULL CONSOLIDATED DATABASE SETUP
-- ========================================================

-- ============================================================================
--  HOMIGO-STYLE MARKETPLACE — Unified schema (Postgres / Supabase)
--  Gộp 3 nguồn về 1 bảng `listings`: crawl (Lớp A) + agent tự đăng (Lớp B) + Zalo (Lớp C)
--  RLS bật cho MỌI bảng (homigo.vn để lộ bảng users vì thiếu RLS — không lặp lại).
--  Chạy trong Supabase SQL Editor, hoặc: psql "$DATABASE_URL" -f schema.sql
--  CHỈ dùng cho DB MỚI TINH, sau đó chạy lần lượt supabase/migrations/*.sql. KHÔNG chạy lại trên DB
--  đang có dữ liệu (create policy không có drop-if-exists -> hỏng giữa chừng; và ghi đè các bản vá).
-- ============================================================================

create extension if not exists "postgis";      -- tìm theo bán kính / bản đồ
create extension if not exists "pg_trgm";       -- full-text tiếng Việt cơ bản

-- ---------- ENUMs ----------
do $$ begin
  create type listing_source   as enum ('crawl','agent','zalo_oa','zalo_miniapp','user');
  create type listing_deal      as enum ('ban','cho_thue');
  create type property_kind     as enum ('phong_tro','can_ho','nha','dat','mat_bang','khac');
  create type listing_status    as enum ('draft','pending','published','rejected','hidden','gone'); -- gone: tin crawl không còn thấy trên nguồn (008)
  create type user_role         as enum ('user','agent','admin');
exception when duplicate_object then null; end $$;

-- ---------- PROFILES (mở rộng auth.users) — form "Đăng ký người bán" của homigo.vn ----------
create table if not exists profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  role         user_role not null default 'user',
  full_name    text,
  phone        text,
  avatar_url   text,
  bio          text,                        -- Tiểu sử
  agency_name  text,                        -- Tên công ty
  license_no   text,                        -- Số giấy phép / chứng chỉ môi giới
  specialties  text[] default '{}',         -- Residential, Commercial, Luxury, Investment, Rentals...
  languages    text[] default '{}',         -- Vietnamese, English, Chinese, Korean...
  years_experience int default 0,
  is_verified  boolean not null default false,
  created_at   timestamptz not null default now()
);

-- ---------- PROJECTS (dự án / "giỏ hàng dự án") ----------
create table if not exists projects (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique,
  name         text not null,
  investor     text,
  description  text,
  province     text, district text, ward text, address text,
  geo          geography(Point,4326),
  amenities    text[] default '{}',
  images       text[] default '{}',
  price_min    bigint, price_max bigint,
  status       listing_status not null default 'published',
  created_at   timestamptz not null default now()
);

-- ---------- LISTINGS (bảng lõi, mọi nguồn đổ về đây) ----------
create table if not exists listings (
  id             uuid primary key default gen_random_uuid(),
  source         listing_source not null,
  source_url     text,                      -- link bài gốc (bắt buộc với source='crawl')
  source_post_id text,                       -- để dedupe / không crawl lại
  agent_id       uuid references profiles(id) on delete set null,  -- null nếu là tin crawl
  project_id     uuid references projects(id) on delete set null,

  deal           listing_deal not null,
  kind           property_kind not null default 'khac',
  title          text not null,
  description    text,

  price_vnd      bigint,
  area_m2        numeric,
  price_per_m2   bigint generated always as
                   (case when price_vnd is not null and area_m2 > 0
                         then (price_vnd / area_m2)::bigint end) stored,
  bedrooms       int, bathrooms int, floors int,
  direction      text,                       -- hướng: dong-nam, tay-bac...
  legal_status   text,                       -- Sổ hồng / Sổ đỏ / Sổ riêng...
  furnishing     text,                       -- Full nội thất / Cơ bản / Bàn giao thô

  province       text, district text, ward text, address text,
  geo            geography(Point,4326),
  lat            double precision,          -- tiện đọc client (geocode Nominatim/Mapbox)
  lng            double precision,
  amenities      text[] not null default '{}',
  images         text[] not null default '{}',

  contact_name   text,
  contact_phone  text,                       -- ⚠ dữ liệu cá nhân (NĐ13/2023) — chỉ lộ khi có consent

  -- AI làm giàu (Lớp A)
  source_site        text,                   -- nhadat.vn | chotot | batdongsan | facebook...
  ai_score           int check (ai_score between 0 and 100),   -- điểm hiển thị "★ 92/100"
  trust_score        int check (trust_score between 0 and 100),
  poster_role_guess  text,                   -- chu_nha | moi_gioi | khong_ro
  price_flag         jsonb,                  -- {reason, deviation_pct, cluster_size, distinct_posters}
  dedupe_key         text,
  first_seen_at      timestamptz,            -- "NhaDat Radar thấy X phút trước"
  -- vòng đời tin (migration 008): học mô hình Homigo firstSeenAt/lastSeenAt/crawlCount/sourceCount
  last_seen_at         timestamptz,          -- lần cào gần nhất còn thấy; không thấy ≥36h -> status 'gone'
  crawl_count          int not null default 1,
  source_count         int not null default 1, -- xuất hiện trên N nguồn (dedupe liên nguồn)
  source_sites         text[],
  phone_masked         text,                 -- SĐT che 4 số cuối (không phải dữ liệu định danh)
  poster_listing_count int,
  poster_reasons       text[] not null default '{}', -- lý do dấu hiệu môi giới/chính chủ
  poster_key           text,                 -- id tài khoản trên nguồn / hash SĐT (011) -> "N tin khác của người đăng"

  status         listing_status not null default 'pending',
  posted_at      timestamptz,
  crawled_at     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_listings_status   on listings(status);
create index if not exists idx_listings_deal_kind on listings(deal, kind);
create index if not exists idx_listings_loc       on listings(province, district);
create index if not exists idx_listings_geo       on listings using gist(geo);
create index if not exists idx_listings_dedupe    on listings(dedupe_key);
create index if not exists idx_listings_agent     on listings(agent_id);
create index if not exists idx_listings_title_trgm on listings using gin(title gin_trgm_ops);

-- ---------- FAVORITES (★ lưu & so sánh) ----------
create table if not exists favorites (
  user_id    uuid not null references profiles(id) on delete cascade,
  listing_id uuid not null references listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

-- ---------- CHAT (buyer ↔ agent) ----------
create table if not exists conversations (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id) on delete set null,
  buyer_id   uuid not null references profiles(id) on delete cascade,
  agent_id   uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (listing_id, buyer_id, agent_id)
);
create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_id       uuid not null references profiles(id) on delete cascade,
  body            text not null,
  created_at      timestamptz not null default now()
);
create index if not exists idx_messages_conv on messages(conversation_id, created_at);

-- ---------- APPOINTMENTS (lịch hẹn xem) ----------
create table if not exists appointments (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings(id) on delete cascade,
  buyer_id   uuid not null references profiles(id) on delete cascade,
  agent_id   uuid not null references profiles(id) on delete cascade,
  slot       timestamptz not null,
  status     text not null default 'requested',   -- requested | confirmed | cancelled
  note       text,
  created_at timestamptz not null default now()
);

-- ============================================================================
--  RLS — bật hết, chỉ mở đúng cửa cần thiết
-- ============================================================================
alter table profiles      enable row level security;
alter table projects      enable row level security;
alter table listings      enable row level security;
alter table favorites     enable row level security;
alter table conversations enable row level security;
alter table messages      enable row level security;
alter table appointments  enable row level security;

-- profiles: đọc hồ sơ công khai; sửa của mình
create policy "profiles_read"        on profiles for select using (true);
create policy "profiles_update_self" on profiles for update using (auth.uid() = id);
create policy "profiles_insert_self" on profiles for insert with check (auth.uid() = id);

-- projects: đọc bản published; ghi = agent/admin
create policy "projects_read" on projects for select
  using (status = 'published' or exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('agent','admin')));
create policy "projects_write" on projects for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('agent','admin')))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('agent','admin')));

-- listings:
--   • đọc: ai cũng đọc tin đã 'published'; agent đọc tin của chính mình ở mọi status
--   • thêm: agent chỉ thêm tin CỦA MÌNH và KHÔNG được giả nguồn crawl/zalo (chống spoof)
--     (tin crawl/zalo do worker dùng service_role ghi — service_role bỏ qua RLS)
--   • sửa/xoá: chủ tin hoặc admin
create policy "listings_read_public" on listings for select
  using (status = 'published' or agent_id = auth.uid()
         or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
-- KHÔNG có policy insert cho client: tin tự đăng đi qua server action createListing
-- (service_role, đã xác thực user + ép giá trị tin cậy). Tránh việc gọi thẳng
-- PostgREST tự đặt status/ai_score/trust_score giả. Crawler cũng dùng service_role.
-- (xem migration 005)
create policy "listings_update_own" on listings for update
  using (agent_id = auth.uid() or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));
create policy "listings_delete_own" on listings for delete
  using (agent_id = auth.uid() or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

-- favorites: chỉ của mình
create policy "favorites_own" on favorites for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- conversations / messages: chỉ người trong cuộc
create policy "conv_participants" on conversations for all
  using (auth.uid() in (buyer_id, agent_id)) with check (auth.uid() in (buyer_id, agent_id));
create policy "msg_participants" on messages for select
  using (exists (select 1 from conversations c where c.id = conversation_id and auth.uid() in (c.buyer_id, c.agent_id)));
create policy "msg_send" on messages for insert with check (
  sender_id = auth.uid()
  and exists (select 1 from conversations c where c.id = conversation_id and auth.uid() in (c.buyer_id, c.agent_id))
);

-- appointments: người trong cuộc
create policy "appt_participants" on appointments for all
  using (auth.uid() in (buyer_id, agent_id)) with check (auth.uid() in (buyer_id, agent_id));

-- ---------- LEADS (form "Liên hệ người bán" ở trang chi tiết) ----------
create table if not exists leads (
  id         uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id) on delete set null,
  name       text not null,
  phone      text not null,
  message    text,
  created_at timestamptz not null default now()
);
alter table leads enable row level security;
-- Bất kỳ ai cũng gửi được liên hệ (form công khai); chỉ agent chủ tin / admin đọc.
create policy "leads_insert_anyone" on leads for insert with check (true);
create policy "leads_read_owner" on leads for select using (
  exists (select 1 from listings l where l.id = listing_id and l.agent_id = auth.uid())
  or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);

-- ---------- LISTING REPORTS (báo tin xấu — migration 010) ----------
create table if not exists listing_reports (
  id          uuid primary key default gen_random_uuid(),
  listing_id  uuid not null references listings(id) on delete cascade,
  reason      text not null check (reason in ('da_ban','sai_gia','sai_dia_chi','gia_chinh_chu','lua_dao','trung_lap','khac')),
  detail      text,
  reporter_id uuid references profiles(id) on delete set null,
  status      text not null default 'new' check (status in ('new','resolved','ignored')),
  created_at  timestamptz not null default now()
);
alter table listing_reports enable row level security;
create policy "reports_insert_anyone" on listing_reports for insert with check (true);
create policy "reports_read_admin" on listing_reports for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));

-- ---------- SAVED SEARCHES (email alert: khách lưu yêu cầu -> gửi mail khi có tin khớp) ----------
create table if not exists saved_searches (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references profiles(id) on delete cascade,
  email         text,                      -- gửi alert
  deal          listing_deal,
  kind          property_kind,
  province      text, district text, ward text,
  price_min     bigint, price_max bigint,
  area_min      numeric, area_max numeric,
  amenities     text[] default '{}',
  active        boolean not null default true,
  last_notified_at timestamptz,
  created_at    timestamptz not null default now()
);
alter table saved_searches enable row level security;
create policy "ss_own" on saved_searches for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Worker matcher (cron): với mỗi tin mới, tìm saved_searches khớp -> gửi email (Resend/SMTP) -> set last_notified_at.

-- ---------- Dữ liệu mẫu: vài dự án (cho trang /projects) ----------
insert into projects (slug, name, investor, province, district, description, amenities, price_min, price_max, status) values
 ('cam-ranh-riviera','Cam Ranh Riviera Beach Resort & Spa','Viet Capital Real Estate','Khánh Hòa','Cam Lâm',
  'Khu nghỉ dưỡng 5 sao tại bán đảo Cam Ranh với bãi biển trắng dài 350m hoàn toàn riêng tư, kiến trúc Địa Trung Hải, cách sân bay Cam Ranh 5 phút.',
  array['pool','gym','park','security','mall'], 8500000000, 65000000000, 'published'),
 ('vinhomes-ocean-park','Vinhomes Ocean Park','Vinhomes','Hà Nội','Gia Lâm',
  'Đại đô thị biển hồ với hồ nước mặn và hồ nước ngọt nhân tạo lớn, tiện ích nội khu đầy đủ.',
  array['pool','gym','school','park'], 2800000000, 9000000000, 'published'),
 ('the-global-city','The Global City','Masterise Homes','TP.HCM','TP Thủ Đức',
  'Khu đô thị trung tâm mới của TP.HCM, chuẩn quốc tế.',
  array['mall','security','park','gym'], 5000000000, 22000000000, 'published')
on conflict (slug) do nothing;

-- ---------- Tự tạo profile khi có user mới đăng ký ----------
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- LUÔN 'user': raw_user_meta_data do client gửi lúc signUp -> đọc role từ đó = ai cũng tự đăng ký làm admin
  -- (đã vá ở migration 001; bản ở đây từng còn lỗ này - chạy lại schema.sql là mở lại lỗ hổng).
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), 'user');
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Gợi ý tìm theo bán kính (dùng trong app):
--   select * from listings
--   where status='published'
--     and ST_DWithin(geo, ST_MakePoint(:lng,:lat)::geography, :meters)
--   order by geo <-> ST_MakePoint(:lng,:lat)::geography limit 50;


-- --- MIGRATION: 001_security_fixes.sql ---
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


-- --- MIGRATION: 002_spam_filter.sql ---
-- ============================================================================
--  MIGRATION 002 - Lọc tin rác MẠNH HƠN (2026-08-14)
--  Xoá tin crawl không phải BĐS: dịch vụ thi công, tuyển dụng, vay vốn,
--  đồ điện tử/tiêu dùng, sim số... (danh sách khớp crawler/junk.mjs)
--  Chạy trong Supabase -> SQL Editor -> dán -> Run. An toàn chạy lại nhiều lần.
-- ============================================================================

delete from public.listings
where source = 'crawl'
  and (
    -- thiết bị điện / vật tư bán lẻ
    title ~* '(đèn (đường|led|năng lượng|pha|trụ)|công tắc|ổ cắm|thiết bị (điện|vệ sinh|nhà bếp|an ninh)|máy bơm|dây cáp)'
    -- dịch vụ thi công / quảng cáo dịch vụ
    or title ~* '(báo giá|(nhận|chuyên|dịch vụ) (thi công|lắp đặt|sửa chữa|sơn)|thi công trọn gói|khoan (giếng|cắt)|hút hầm|thông (cống|tắc)|diệt (mối|côn trùng|chuột)|chuyển (nhà|văn phòng) trọn gói|taxi tải|vệ sinh công nghiệp)'
    -- tuyển dụng / việc làm
    or title ~* '(tuyển (dụng|nhân viên|gấp|ctv|cộng tác)|cần tuyển|việc làm|tìm việc)'
    -- tài chính / vay
    or title ~* '(cho vay|vay (vốn|tiền|nhanh|online)|giải ngân|đáo hạn|hỗ trợ tài chính|bảo hiểm (nhân thọ|xe|sức khỏe))'
    -- hàng tiêu dùng không phải BĐS
    or title ~* '(sim số|iphone|macbook|laptop|máy giặt|tủ lạnh|máy lọc nước|camera (wifi|hành trình)|mỹ phẩm|nước hoa|quần áo|giày dép|thực phẩm chức năng|thanh lý (bàn ghế|đồ|kệ))'
    -- tiêu đề quá ngắn = rác
    or length(trim(title)) < 8
  );


-- --- MIGRATION: 003_uploads_history_vector.sql ---
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


-- --- MIGRATION: 004_leads_project_appt.sql ---
-- ============================================================================
--  004 — Hoàn thiện: lead theo dự án + index lịch hẹn
--  Chạy trong Supabase SQL Editor (idempotent, an toàn chạy lại nhiều lần).
-- ============================================================================

-- Lead gửi từ trang dự án cần biết "dự án nào" (trước đây listing_id=null nên mất định danh).
alter table leads add column if not exists project_id uuid references projects(id) on delete set null;

-- RLS đọc lead: giữ nguyên chủ tin/admin, KHÔNG mở lead dự án cho người thường
-- (lead dự án chỉ admin đọc — đã đúng vì listing_id null). Không cần policy mới.

-- Truy vấn lịch hẹn của người bán/khách nhanh hơn.
create index if not exists idx_appointments_agent on appointments(agent_id, slot);
create index if not exists idx_appointments_buyer on appointments(buyer_id, slot);

-- Bật realtime cho chat (nếu publication supabase_realtime tồn tại).
do $$ begin
  alter publication supabase_realtime add table messages;
exception when duplicate_object then null; when undefined_object then null; end $$;


-- --- MIGRATION: 005_lock_listing_insert.sql ---
-- ============================================================================
--  005 — Vá lỗ hổng: chặn insert listing trực tiếp qua PostgREST
--  Chạy 1 lần trong Supabase SQL Editor (idempotent).
-- ============================================================================
--
--  VẤN ĐỀ: policy insert cũ (migration 001) chỉ kiểm tra
--    (agent_id = auth.uid() and source = 'agent')
--  và revoke ở 001 chỉ chặn UPDATE — KHÔNG chặn INSERT các cột nhạy cảm.
--  Hệ quả: một user đã đăng nhập có thể gọi thẳng POST /rest/v1/listings bằng
--  anon key, tự đặt status='published', ai_score=100, trust_score=100,
--  poster_role_guess='chu_nha' -> tin lên thẳng không qua duyệt + giả điểm tin cậy.
--
--  CÁCH VÁ: bỏ hẳn quyền insert listings của client. Tin tự đăng đi qua server
--  action createListing (dùng service_role, đã xác thực user + ép giá trị tin cậy).
--  service_role BỎ QUA RLS nên vẫn ghi được; crawler cũng dùng service_role.

drop policy if exists "listings_insert_own" on public.listings;
drop policy if exists "listings_insert_own_agent" on public.listings;

-- Hardening: chặn tự set role/is_verified ngay khi INSERT profile
-- (trigger handle_new_user là security definer nên KHÔNG bị ảnh hưởng).
revoke insert (role, is_verified) on public.profiles from anon, authenticated;


-- --- MIGRATION: 006_advisor_hardening.sql ---
-- ============================================================================
--  006 — Vá cảnh báo Supabase advisor (ĐÃ ÁP TRỰC TIẾP qua MCP 2026-08-14,
--  file này chỉ để theo dõi lịch sử — không cần chạy lại).
-- ============================================================================

-- 1) handle_new_user là SECURITY DEFINER nhưng anon/authenticated gọi được qua
--    /rest/v1/rpc -> thu quyền EXECUTE (trigger auth vẫn chạy bình thường).
revoke execute on function public.handle_new_user() from anon, authenticated, public;

-- 2) match_listings: cố định search_path (chống search_path hijack qua RPC).
alter function public.match_listings(vector, int) set search_path = public;


-- --- MIGRATION: 007_app_config.sql ---
-- 007 — Bảng cấu hình nội bộ (lưu Zalo refresh_token xoay vòng...).
-- RLS bật + KHÔNG có policy: client thường bị chặn hoàn toàn, chỉ service_role đọc/ghi.
create table if not exists app_config (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
alter table app_config enable row level security;


-- --- MIGRATION: 008_listing_lifecycle.sql ---
-- 008: vòng đời tin + trường đã tính ở crawler nhưng chưa từng ghi vào DB
-- (học từ mô hình Homigo: firstSeenAt/lastSeenAt/crawlCount/sourceCount + posterSignal có lý do + SĐT che)
alter table listings
  add column if not exists last_seen_at         timestamptz,          -- lần cào gần nhất còn thấy tin
  add column if not exists crawl_count          int not null default 1, -- số lần cào thấy tin
  add column if not exists source_count         int not null default 1, -- số nguồn cùng đăng (dedupe liên nguồn)
  add column if not exists source_sites         text[],               -- các nguồn đó
  add column if not exists phone_masked         text,                 -- "0397 55****" — che 4 số, không phải dữ liệu định danh
  add column if not exists poster_listing_count int,                  -- tài khoản người đăng có bao nhiêu tin trong đợt cào
  add column if not exists poster_reasons       text[] not null default '{}'; -- lý do dấu hiệu môi giới/chính chủ (hiện cho người dùng)

-- Trạng thái mới: tin crawl không còn thấy trên nguồn ≥2 lần cào liên tiếp -> "gone" (ẩn khỏi tìm kiếm, chi tiết vẫn mở kèm nhãn)
alter type listing_status add value if not exists 'gone';

-- (policy đọc tin 'gone' nằm ở 009 — Postgres không cho dùng giá trị enum mới trong cùng transaction)

-- Backfill: coi lần thấy gần nhất = lần cào gần nhất đã ghi
update listings set last_seen_at = coalesce(crawled_at, first_seen_at, created_at) where last_seen_at is null;

create index if not exists idx_listings_source_post on listings(source_site, source_post_id);
create index if not exists idx_listings_first_seen  on listings(first_seen_at desc);
create index if not exists idx_listings_last_seen   on listings(last_seen_at);


-- --- MIGRATION: 009_listing_gone_policy.sql ---
-- 009: trang chi tiết vẫn mở được tin crawl đã 'gone' (kèm nhãn "có thể đã giao dịch/gỡ").
-- Tách khỏi 008 vì Postgres không cho dùng giá trị enum vừa thêm trong cùng transaction.
-- search/home/chat/sitemap đều lọc status='published' phía app nên tin gone không lọt vào danh sách.
drop policy if exists "listings_read_public" on listings;
create policy "listings_read_public" on listings for select
  using (status = 'published'
         or (status = 'gone' and source = 'crawl')
         or agent_id = auth.uid()
         or exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin'));


-- --- MIGRATION: 010_listing_reports.sql ---
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
-- drop-if-exists (audit 22/9): schema.sql đã tạo sẵn 2 policy này -> dựng DB sạch (schema.sql rồi migrations) chết ở đây
drop policy if exists "reports_insert_anyone" on listing_reports;
drop policy if exists "reports_read_admin" on listing_reports;
create policy "reports_insert_anyone" on listing_reports for insert with check (true);
create policy "reports_read_admin" on listing_reports for select using (
  exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'admin')
);
-- update/delete: chỉ service role (admin action) — không mở policy cho client.


-- --- MIGRATION: 011_poster_key.sql ---
-- 011: định danh người đăng (không phải dữ liệu cá nhân: id tài khoản trên nguồn hoặc hash SĐT)
-- -> "Người đăng này có N tin khác" (kiểu hồ sơ môi giới batdongsan) + tín hiệu môi giới chính xác hơn.
alter table listings add column if not exists poster_key text;
create index if not exists idx_listings_poster_key on listings(poster_key) where poster_key is not null;


-- --- MIGRATION: 012_projects_priority.sql ---
-- 012: dự án đối tác / Nhã Đạt xếp đầu (trang chủ + /projects). priority càng cao càng lên trước; is_partner để gắn nhãn.
alter table projects add column if not exists priority int not null default 0;
alter table projects add column if not exists is_partner boolean not null default false;
create index if not exists idx_projects_priority on projects(priority desc);


-- --- MIGRATION: 013_project_specs.sql ---
-- 013: thông số dự án + link nguồn (2026-08-17)
-- Crawler mogi-projects.mjs bóc được bảng thông số (tổng diện tích, diện tích xây dựng, ngày khởi
-- công/hoàn thành, pháp lý, diện tích căn từ-đến) nhưng bảng projects không có chỗ chứa -> mất sạch,
-- trang dự án chỉ còn 1 khối mô tả dài. Thêm jsonb để giữ nguyên cặp nhãn/giá trị của nguồn
-- (mỗi dự án có bộ chỉ tiêu khác nhau, không gò được thành cột cố định).
alter table projects add column if not exists specs jsonb not null default '{}'::jsonb;
alter table projects add column if not exists handover text;      -- "Bàn giao: 2020" ở trang danh sách
alter table projects add column if not exists source_url text;    -- link trang gốc trên nguồn
alter table projects add column if not exists price_per_m2_text text; -- "65 - 68 triệu/m²" (khoảng đơn giá)


-- --- MIGRATION: 014_sync_ten_google.sql ---
-- Đồng bộ tên hiển thị khi người dùng đổi tên trên Google
--
-- Vấn đề (19/8): trigger on_auth_user_created chỉ chạy khi INSERT — tức đúng một lần lúc
-- đăng ký. Nó chép raw_user_meta_data->>'full_name' sang profiles.full_name rồi thôi.
-- Người dùng đổi tên tài khoản Google -> lần đăng nhập sau Google gửi tên mới, Supabase
-- cập nhật auth.users, nhưng profiles.full_name vẫn giữ tên cũ từ ngày đăng ký. Web đọc
-- profiles nên hiện tên cũ mãi.
--
-- KHÔNG ghi đè vô điều kiện: trang /account cho người dùng tự đặt tên (đo thật: có tài
-- khoản Google trả "Quang Lê" nhưng profiles để "Lê Quang" — người dùng cố ý sửa). Ghi đè
-- kiểu đó sẽ xoá lựa chọn của họ mỗi lần đăng nhập.
--
-- Quy tắc: chỉ đồng bộ khi tên hiện tại RỖNG, hoặc vẫn đúng bằng tên Google CŨ (nghĩa là
-- người dùng chưa từng tự sửa). Ai đã tự đặt tên thì giữ nguyên vĩnh viễn.
create or replace function sync_ten_tu_oauth() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  ten_moi text := nullif(trim(coalesce(new.raw_user_meta_data->>'full_name',
                                       new.raw_user_meta_data->>'name', '')), '');
  ten_cu  text := nullif(trim(coalesce(old.raw_user_meta_data->>'full_name',
                                       old.raw_user_meta_data->>'name', '')), '');
begin
  if ten_moi is null or ten_moi is not distinct from ten_cu then
    return new;                                   -- tên không đổi -> không đụng gì
  end if;

  update public.profiles p
     set full_name = ten_moi
   where p.id = new.id
     and (coalesce(trim(p.full_name), '') = ''    -- chưa có tên
          or trim(p.full_name) = ten_cu);         -- vẫn là tên Google cũ, chưa tự sửa
  return new;
end $$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of raw_user_meta_data on auth.users
  for each row execute function sync_ten_tu_oauth();


-- --- MIGRATION: 015_listings_specs.sql ---
-- Bảng thông số riêng của từng nguồn cho LISTINGS (013 chỉ thêm cột này cho projects).
--
-- Cột đã được áp TRỰC TIẾP lên DB ngày 19/8 (apply_migration "listings_specs" qua MCP) nhưng
-- quên lưu file vào repo — review 19/8 bắt được: môi trường nào dựng từ migrations sẽ thiếu
-- cột trong khi LISTING_COLS (src/lib/cols.ts) và seed daily.mjs đều đọc/ghi nó -> mọi
-- select(LISTING_COLS) trả 42703 và toàn bộ seed chết. File này để repo tự đủ.
alter table public.listings add column if not exists specs jsonb;
comment on column public.listings.specs is
  'Bảng thông số riêng của từng nguồn (guland: mặt tiền/chiều dài/hình dáng đất/loại sổ; batdongsan: hướng/năm xây/đường vào). Mỗi nguồn một bộ nhãn nên để jsonb, web chỉ hiện ô có giá trị.';


-- --- MIGRATION: 016_profiles_anon_column_grants.sql ---
-- Sua loi goc cua migration 001: `revoke select (phone, license_no) ... from anon` KHONG the
-- tru bot cot khoi quyen SELECT da cap TOAN BANG — Postgres chi go duoc grant da cap o muc cot.
-- Kiem chung 19/8 bang khoa anon that qua PostgREST: phone + license_no van doc duoc binh thuong,
-- tuc dong revoke trong 001 chua tung co hieu luc tren bat ky lan trien khai nao.
--
-- Cach dung: thu het quyen SELECT bang cua anon, roi cap lai DUNG danh sach cot an toan.
-- `authenticated` giu nguyen quyen cu (doc duoc phone/license_no): trang /admin doc phone qua
-- session dang nhap, va quyet dinh 19/8 la chi can chan khach vang lai truoc.
-- /agents da doi sang chon cot theo trang thai dang nhap — khach vang lai khong xin license_no
-- nua, khong thi PostgREST tra 42501 cho CA truy van va trang trang voi khach.
revoke select on public.profiles from anon;
grant select (id, role, full_name, avatar_url, bio, agency_name, specialties, languages, years_experience, is_verified, created_at)
  on public.profiles to anon;


-- --- MIGRATION: 017_first_seen_default.sql ---
-- 017 (21/8): first_seen_at chỉ được crawler set - tin tự đăng (dashboard), tin Zalo OA và
-- tin bot Zalo đều NULL. Hậu quả: không bao giờ vào email alert (alerts.mjs .gt(first_seen_at)),
-- rơi cuối sort "Mới nhất" (nullsFirst:false), không được đếm "N tin mới hôm nay".
-- Đặt default để đường insert nào quên cũng không tái phát, và bù các hàng đã NULL.
alter table listings alter column first_seen_at set default now();
update listings set first_seen_at = coalesce(created_at, now()) where first_seen_at is null;


-- --- MIGRATION: 018_alerts_unsub_va_kho_anh.sql ---
-- 018 (21/8): token hủy đăng ký email (link trong footer mail phải có thật - trước giờ mail
-- hứa "hủy được ngay trong email" mà không có nút) + bucket công khai chứa ảnh tin Zalo
-- (link CDN Zalo có hạn, chết là tin trắng ảnh - tải về kho nhà cho bền).
-- Hủy = set active=false chứ KHÔNG xoá hàng: còn xem và quản lý được trong Supabase.
alter table saved_searches add column if not exists unsub_token uuid not null default gen_random_uuid();
insert into storage.buckets (id, name, public) values ('anh-zalo', 'anh-zalo', true)
on conflict (id) do nothing;


-- --- MIGRATION: 019_cau_noi_hoi_dap.sql ---
-- 019 (21/8): hạ tầng "Cầu Nối" - bot Zalo làm trung gian hỏi đáp buyer <-> seller
-- (học mô hình nhadat.CC: AI mặt tiền, người hậu trường; câu trả lời TÍCH LUỸ vào
-- listing_facts để buyer sau hỏi lại thì bot tự trả, không phiền seller lần hai).
--
-- - leads.notified_at: bot poll bảng leads, lead mới thì nhắn Zalo cho admin rồi đóng dấu.
-- - listings.zalo_thread: thread Zalo của NGƯỜI ĐĂNG tin qua bot - có nó mới relay
--   được câu hỏi của buyer sang seller. Tin cào không có -> đi đường admin gọi SĐT gốc.
-- - info_requests: hàng đợi câu hỏi (pending -> answered / admin / expired).
-- - listing_facts: kho hỏi-đáp đã chốt theo tin, ai đọc cũng được (không lộ danh tính).
-- info_requests bật RLS KHÔNG policy = chỉ service role (bot) đọc ghi.
alter table leads add column if not exists notified_at timestamptz;
alter table listings add column if not exists zalo_thread text;

create table if not exists info_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id) on delete cascade,
  buyer_thread text not null,
  seller_thread text,
  question text not null,
  status text not null default 'pending',
  answer text,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  answered_at timestamptz
);
alter table info_requests enable row level security;

create table if not exists listing_facts (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id) on delete cascade,
  question text not null,
  answer text not null,
  source text not null default 'seller_zalo',
  created_at timestamptz not null default now()
);
alter table listing_facts enable row level security;
drop policy if exists "facts_read" on listing_facts;  -- chạy lại được (audit 22/9)
create policy "facts_read" on listing_facts for select using (true);


-- --- MIGRATION: 020_saved_searches_kenh_zalo.sql ---
-- 020 (21/8): đăng ký nhận tin mới QUA ZALO từ bot - khách tìm nhà trong chat, bot hỏi
-- "muốn nhận tin nhắn khi có tin mới khớp không?", gật là lưu zalo_thread; vòng quét trong
-- bot (30 phút/lượt) nhắn thẳng vào hội thoại khi có tin mới. Khách đưa kèm Gmail thì cùng
-- row đó có email -> alerts.mjs (CI) gửi mail như đăng ký từ web, có nút hủy.
-- zalo_notified_at tách khỏi last_notified_at (email) để hai kênh không giẫm mốc của nhau.
-- Hủy: khách nhắn "ngừng báo tin" (bot set active=false) hoặc bấm hủy trong email - một
-- công tắc tắt cả hai kênh.
alter table saved_searches add column if not exists zalo_thread text;
alter table saved_searches add column if not exists zalo_notified_at timestamptz;


-- --- MIGRATION: 021_service_role_statement_timeout.sql ---
-- 021 (23/8): seed CI chết "canceling statement due to statement timeout" khi DB chạm 13k
-- tin - trần mặc định 8s của các role API quá chật cho upsert theo lô (daily.mjs cũng đã
-- giảm nhịp update 200 -> 50). Nới CHỈ cho service_role (pipeline dùng); anon/authenticated
-- giữ 8s để query web lỗi không treo cả trang.
alter role service_role set statement_timeout = '120s';
notify pgrst, 'reload config';


-- --- MIGRATION: 022_chan_tu_phong_admin.sql ---
-- 022 (24/8): bịt lỗ hổng "tự phong admin". Policy profiles_update_self cho user sửa hàng
-- của chính mình nhưng KHÔNG chặn cột nào (with_check null, grant UPDATE toàn bảng cho
-- authenticated), nên bất kỳ ai đăng nhập cũng chạy được qua Supabase client của họ:
--   update profiles set role='admin', is_verified=true where id=auth.uid();
-- -> tự lên admin + tự gắn mác "đã xác minh". Đã kiểm chứng lỗ hổng thật 24/8.
--
-- Vá bằng BEFORE UPDATE trigger: ép role & is_verified giữ nguyên giá trị cũ TRỪ KHI caller
-- là service_role / kết nối trực tiếp (admin action qua createAdminClient, seed, bot,
-- dashboard). Không đụng việc user tự sửa phone/bio/avatar. Đã test:
--   - authenticated tự đổi role/is_verified -> bị ép giữ nguyên; đổi full_name -> vẫn được.
--   - service_role đổi role='agent', is_verified=true -> thành công.
create or replace function public.chan_tu_phong_admin()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), current_user) not in ('service_role', 'postgres', 'supabase_admin') then
    new.role := old.role;
    new.is_verified := old.is_verified;
  end if;
  return new;
end;
$$;

drop trigger if exists chan_tu_phong_admin on public.profiles;
create trigger chan_tu_phong_admin
  before update on public.profiles
  for each row execute function public.chan_tu_phong_admin();


-- --- MIGRATION: 023_last_confirmed_at.sql ---
-- 023 (25/8): F2 "còn bán không" - bot hỏi lại người bán tin ĐĂNG QUA ZALO sau 7 ngày để
-- lọc tin ma. last_confirmed_at = lần cuối chốt "còn bán"; null hoặc quá 7 ngày -> hỏi lại.
alter table listings add column if not exists last_confirmed_at timestamptz;


-- --- MIGRATION: 024_prune_stale_listings.sql ---
-- 024: Dọn dẹp tin crawl tồn đọng quá hạn để giải phóng dung lượng DB (ngăn chặn chạm trần 500MB Supabase)
-- Tin người dùng tự đăng (source != 'crawl': agent, user, zalo_oa, zalo_miniapp) KHÔNG BAO GIỜ bị ảnh hưởng.

-- 1. Chuyển sang 'gone' các tin crawl không thấy lại trên nguồn quá 7 ngày
update listings
set status = 'gone'
where source = 'crawl'
  and status = 'published'
  and last_seen_at < now() - interval '7 days';

-- 2. Xoá vĩnh viễn các tin crawl quá 21 ngày không thấy lại
delete from listings
where source = 'crawl'
  and last_seen_at < now() - interval '21 days';

-- 3. Giải phóng embedding vector(768) cho các tin đã 'gone' (tin gone không lên search nên không cần vector trong RAM/HNSW)
update listings
set embedding = null
where status = 'gone'
  and embedding is not null;

-- 4. Dọn lịch sử giá quá 180 ngày
delete from price_history
where day < (current_date - interval '180 days')::date;


-- --- MIGRATION: 025_crm_core.sql ---
-- ============================================================================
-- 025 — Hệ Thống CRM Khách Hàng Hai Vai, Phễu Deals & Lịch Xem Nhà
-- Đồng bộ mô hình CRM từ Nhadat.cc sang NhaDat-Radar
-- ============================================================================

-- 1. Bảng Khách Mua (Buyers)
create table if not exists public.buyers (
  id uuid not null default gen_random_uuid() primary key,
  name text,
  phone text,
  zalo_user_id text,
  created_at timestamp with time zone not null default now(),
  preferences jsonb default '{}'::jsonb,
  last_contact_at timestamp with time zone,
  notes text,
  auth_user_id uuid references auth.users(id) on delete set null
);

-- 2. Bảng Người Bán / Chủ Nhà / Môi Giới (Sellers)
create table if not exists public.sellers (
  id uuid not null default gen_random_uuid() primary key,
  name text,
  phone text,
  phone_proxy text,
  seller_type text not null default 'unknown',
  zalo_user_id text,
  rating_sum integer not null default 0,
  rating_count integer not null default 0,
  created_at timestamp with time zone not null default now(),
  auth_user_id uuid references auth.users(id) on delete set null,
  active_listing_id uuid references public.listings(id) on delete set null,
  xung_ho text,
  ten_tro_ly text
);

-- 3. Bảng BĐS Khách Quan Tâm (Interests)
create table if not exists public.interests (
  buyer_id uuid not null references public.buyers(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  created_at timestamp with time zone not null default now(),
  primary key (buyer_id, listing_id)
);

-- 4. Bảng Phễu Thương Vụ (Deals Pipeline)
create table if not exists public.deals (
  id uuid not null default gen_random_uuid() primary key,
  listing_id uuid not null references public.listings(id) on delete cascade,
  buyer_id uuid references public.buyers(id) on delete set null,
  stage text not null default 'lead', -- lead, viewing, negotiating, closing, won, lost
  price_vnd bigint,
  fee_pct numeric default 1.0,
  closed_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  ctv_id uuid
);

-- 5. Bảng Lịch Hẹn Xem Nhà (Viewings)
create table if not exists public.viewings (
  id uuid not null default gen_random_uuid() primary key,
  listing_id uuid references public.listings(id) on delete set null,
  buyer_id uuid references public.buyers(id) on delete set null,
  guide text,
  slot timestamp with time zone,
  status text not null default 'proposed', -- proposed, pending, done, cancelled
  buyer_rating integer,
  note text,
  created_at timestamp with time zone not null default now(),
  time_text text,
  phone text,
  listing_code text,
  source text default 'bot'
);

-- 6. Bảng Việc Nhắc Nhở & Follow-up (Reminders)
create table if not exists public.reminders (
  id uuid not null default gen_random_uuid() primary key,
  kind text not null default 'follow_up', -- follow_up, viewing, promise, escalation, report
  buyer_id uuid references public.buyers(id) on delete set null,
  seller_id uuid references public.sellers(id) on delete set null,
  listing_id uuid references public.listings(id) on delete set null,
  due_at timestamp with time zone not null default now(),
  note text not null,
  status text not null default 'pending', -- pending, done, dismissed
  created_at timestamp with time zone not null default now(),
  sent_at timestamp with time zone,
  viewing_id uuid,
  ctv_id uuid,
  attempts integer not null default 0,
  last_error text
);

-- Indexes tối ưu truy vấn CRM
create index if not exists idx_buyers_zalo on public.buyers(zalo_user_id);
create index if not exists idx_buyers_phone on public.buyers(phone);
create index if not exists idx_sellers_zalo on public.sellers(zalo_user_id);
create index if not exists idx_deals_stage on public.deals(stage);
create index if not exists idx_viewings_slot on public.viewings(slot);
create index if not exists idx_reminders_due on public.reminders(due_at) where status = 'pending';

-- RLS (audit 22/9): bảng chứa tên/SĐT/Zalo ID khách + giá chốt. Thiếu RLS = ai có anon key (public trong
-- bundle web) đọc/ghi/xoá được qua PostgREST. Web/bot đều ghi bằng service_role (bỏ qua RLS); client chỉ
-- admin đọc được (AdminShell đếm nhắc việc bằng browser client). la_admin() định nghĩa ở 026 — nếu áp 025
-- trước 026 thì chạy 026 ngay sau (026 tự bật lại RLS + policy cho các bảng này).
alter table public.buyers    enable row level security;
alter table public.sellers   enable row level security;
alter table public.interests enable row level security;
alter table public.deals     enable row level security;
alter table public.viewings  enable row level security;
alter table public.reminders enable row level security;


-- --- MIGRATION: 026_audit_hardening.sql ---
-- 026 (22/9/2026): vá các lỗ hổng từ đợt audit. CHẠY LẠI ĐƯỢC (idempotent).
-- 026 TƯƠNG THÍCH với code web cũ -> chạy được ngay. Phần thu quyền ĐỌC CỘT (listings.contact_phone của
-- anon, profiles.phone của authenticated) tách sang 027: code cũ select các cột đó -> 42501 -> trang tin /
-- trang tài khoản hỏng. 027 chỉ chạy SAU KHI code mới (PR audit 22/9) đã deploy.
--
-- Đã kiểm chứng trên DB live trước khi viết (catalog, read-only):
--   * anon SELECT được listings.contact_phone (89 tin published có SĐT) -> "đăng nhập để xem SĐT" chỉ là che UI
--   * authenticated UPDATE được listings.status/trust_score (revoke cột ở 001 chưa từng có hiệu lực)
--   * authenticated SELECT được profiles.phone của MỌI user; INSERT được cột profiles.role
--   * profiles.role DEFAULT = 'admin' (!) -> insert profile không ghi role = tự thành admin
--   * sync_ten_tu_oauth (SECURITY DEFINER) gọi được qua /rest/v1/rpc bởi anon/authenticated
--   * chan_tu_phong_admin không đặt search_path; chỉ chặn UPDATE, không chặn INSERT
--   * listings.geo = NULL cho 100% tin (crawler chỉ ghi lat/lng) -> PostGIS/GiST vô dụng
--   * thiếu app_config (007), bot_errors; bot_state có trên live nhưng không có trong repo
--

-- ===================================================================================
-- 0. Hàm tiện ích
-- ===================================================================================
-- Caller có phải kênh đặc quyền (service_role / kết nối trực tiếp: seed, bot, admin action)?
create or replace function public.la_dac_quyen()
returns boolean language sql stable set search_path = public as $$
  select coalesce(auth.role(), current_user) in ('service_role', 'postgres', 'supabase_admin');
$$;

-- Người gọi là admin? SECURITY DEFINER để đọc profiles không vướng column grant/RLS.
create or replace function public.la_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin');
$$;
revoke execute on function public.la_admin() from public, anon;
grant execute on function public.la_admin() to authenticated, service_role;

-- ===================================================================================
-- 1. profiles: chặn tự phong admin ở cả INSERT, default role an toàn, ẩn SĐT
-- ===================================================================================
alter table public.profiles alter column role set default 'user';

create or replace function public.chan_tu_phong_admin()
returns trigger language plpgsql set search_path = public as $$
begin
  if public.la_dac_quyen() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.role := 'user';
    new.is_verified := false;
  else
    new.role := old.role;
    new.is_verified := old.is_verified;
  end if;
  return new;
end;
$$;

drop trigger if exists chan_tu_phong_admin on public.profiles;
create trigger chan_tu_phong_admin
  before insert or update on public.profiles
  for each row execute function public.chan_tu_phong_admin();

-- Hồ sơ của chính mình (kể cả phone). 027 sẽ thu quyền đọc cột phone của authenticated; code mới đọc qua đây.
create or replace function public.ho_so_cua_toi()
returns setof public.profiles language sql stable security definer set search_path = public as $$
  select * from public.profiles where id = auth.uid();
$$;
revoke execute on function public.ho_so_cua_toi() from public, anon;
grant execute on function public.ho_so_cua_toi() to authenticated;

-- Hàm trigger SECURITY DEFINER không được gọi thẳng qua RPC.
revoke execute on function public.sync_ten_tu_oauth() from public, anon, authenticated;

-- ===================================================================================
-- 2. listings: chủ tin không được tự sửa cột kiểm duyệt / điểm / nguồn
-- ===================================================================================
create or replace function public.chan_sua_cot_listing()
returns trigger language plpgsql set search_path = public as $$
begin
  if public.la_dac_quyen() or public.la_admin() then
    return new;
  end if;
  new.ai_score       := old.ai_score;
  new.trust_score    := old.trust_score;
  new.price_flag     := old.price_flag;
  new.source         := old.source;
  new.source_site    := old.source_site;
  new.source_post_id := old.source_post_id;
  new.source_url     := old.source_url;
  new.agent_id       := old.agent_id;
  -- Chủ tin chỉ được tự GỠ tin (hidden/draft). Lên lại 'published' chỉ từ bản nháp của chính họ;
  -- tin admin đã ẩn/từ chối thì phải qua admin.
  if new.status is distinct from old.status
     and not (new.status in ('hidden', 'draft')
              or (new.status = 'published' and old.status = 'draft')) then
    new.status := old.status;
  end if;
  return new;
end;
$$;

drop trigger if exists chan_sua_cot_listing on public.listings;
create trigger chan_sua_cot_listing
  before update on public.listings
  for each row execute function public.chan_sua_cot_listing();

-- ===================================================================================
-- 3. listings.geo đồng bộ từ lat/lng (PostGIS thật sự dùng được)
-- ===================================================================================
create or replace function public.dong_bo_geo_listing()
returns trigger language plpgsql set search_path = public, extensions as $$
begin
  if new.lat is not null and new.lng is not null
     and new.lat between -90 and 90 and new.lng between -180 and 180 then
    new.geo := st_setsrid(st_makepoint(new.lng, new.lat), 4326)::geography;
  else
    new.geo := null;
  end if;
  return new;
end;
$$;

drop trigger if exists dong_bo_geo_listing on public.listings;
create trigger dong_bo_geo_listing
  before insert or update of lat, lng on public.listings
  for each row execute function public.dong_bo_geo_listing();

-- backfill (trigger trên chạy vì cột lat nằm trong SET)
update public.listings set lat = lat where lat is not null and lng is not null and geo is null;

-- ===================================================================================
-- 4. listings.has_contact_phone: cờ "có SĐT" cho khách chưa đăng nhập (027 thu quyền anon đọc contact_phone)
-- ===================================================================================
alter table public.listings
  add column if not exists has_contact_phone boolean generated always as (contact_phone is not null) stored;

-- ===================================================================================
-- 5. saved_searches: email luôn là email tài khoản; client không tự đặt kênh Zalo
-- ===================================================================================
create or replace function public.ep_saved_search()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.la_dac_quyen() then
    return new;
  end if;
  new.email := (select u.email from auth.users u where u.id = auth.uid());
  if tg_op = 'INSERT' then
    new.zalo_thread := null;
    new.zalo_notified_at := null;
    new.last_notified_at := null;
    new.unsub_token := gen_random_uuid();
  else
    new.zalo_thread := old.zalo_thread;
    new.zalo_notified_at := old.zalo_notified_at;
    new.unsub_token := old.unsub_token;
  end if;
  return new;
end;
$$;
revoke execute on function public.ep_saved_search() from public, anon, authenticated;

drop trigger if exists ep_saved_search on public.saved_searches;
create trigger ep_saved_search
  before insert or update on public.saved_searches
  for each row execute function public.ep_saved_search();

-- ===================================================================================
-- 6. leads / listing_reports: form công khai không được giả mạo cột nội bộ
-- ===================================================================================
create or replace function public.ep_lead_moi()
returns trigger language plpgsql set search_path = public as $$
begin
  if not public.la_dac_quyen() then
    new.notified_at := null;   -- anon đặt sẵn notified_at = lead không bao giờ báo admin
  end if;
  return new;
end;
$$;
drop trigger if exists ep_lead_moi on public.leads;
create trigger ep_lead_moi before insert on public.leads
  for each row execute function public.ep_lead_moi();

drop policy if exists "reports_insert_anyone" on public.listing_reports;
create policy "reports_insert_anyone" on public.listing_reports for insert
  with check (reporter_id is null or reporter_id = auth.uid());
alter table public.listing_reports drop constraint if exists listing_reports_detail_len;
alter table public.listing_reports add constraint listing_reports_detail_len
  check (char_length(coalesce(detail, '')) <= 2000) not valid;

-- ===================================================================================
-- 7. conversations / appointments: chỉ người mua tạo, đúng người bán của tin
-- ===================================================================================
drop policy if exists "conv_participants" on public.conversations;
drop policy if exists "conv_select" on public.conversations;
drop policy if exists "conv_insert" on public.conversations;
create policy "conv_select" on public.conversations for select
  using (auth.uid() in (buyer_id, agent_id));
create policy "conv_insert" on public.conversations for insert
  with check (
    buyer_id = auth.uid() and agent_id <> buyer_id
    and exists (select 1 from public.listings l where l.id = listing_id and l.agent_id = conversations.agent_id)
  );
-- không mở update/delete: trước đây một bên xoá được hội thoại (cascade mất tin nhắn của bên kia)

drop policy if exists "appt_participants" on public.appointments;
drop policy if exists "appt_select" on public.appointments;
drop policy if exists "appt_insert" on public.appointments;
drop policy if exists "appt_update" on public.appointments;
create policy "appt_select" on public.appointments for select
  using (auth.uid() in (buyer_id, agent_id));
create policy "appt_insert" on public.appointments for insert
  with check (
    buyer_id = auth.uid() and agent_id <> buyer_id and status = 'requested'
    and exists (select 1 from public.listings l where l.id = listing_id and l.agent_id = appointments.agent_id)
  );
create policy "appt_update" on public.appointments for update
  using (auth.uid() in (buyer_id, agent_id)) with check (auth.uid() in (buyer_id, agent_id));

create or replace function public.chan_sua_lich_hen()
returns trigger language plpgsql set search_path = public as $$
begin
  if public.la_dac_quyen() then
    return new;
  end if;
  new.listing_id := old.listing_id;
  new.buyer_id   := old.buyer_id;
  new.agent_id   := old.agent_id;
  if new.status not in ('requested', 'confirmed', 'cancelled') then
    raise exception 'trạng thái lịch hẹn không hợp lệ: %', new.status using errcode = '22023';
  end if;
  if new.status = 'confirmed' and old.status is distinct from 'confirmed' and auth.uid() is distinct from old.agent_id then
    raise exception 'chỉ người bán được xác nhận lịch hẹn' using errcode = '42501';
  end if;
  return new;
end;
$$;
drop trigger if exists chan_sua_lich_hen on public.appointments;
create trigger chan_sua_lich_hen before update on public.appointments
  for each row execute function public.chan_sua_lich_hen();

-- ===================================================================================
-- 8. Bảng nội bộ còn thiếu / chưa có trong repo (RLS bật, không policy = chỉ service_role)
-- ===================================================================================
create table if not exists public.app_config (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.app_config enable row level security;

-- đọc ở /admin (tab crawl); bot/bridge ghi
create table if not exists public.bot_errors (
  id     bigserial primary key,
  at     timestamptz not null default now(),
  source text,
  detail text
);
create index if not exists idx_bot_errors_at on public.bot_errors (at desc);
alter table public.bot_errors enable row level security;

-- đã tạo tay trên live (migration "bot_state_persist" 25/8) nhưng chưa từng vào repo
create table if not exists public.bot_state (
  loai       text not null,
  thread     text not null,
  payload    jsonb,
  expires_at timestamptz,
  primary key (loai, thread)
);
create index if not exists idx_bot_state_exp on public.bot_state (expires_at);
alter table public.bot_state enable row level security;

-- ===================================================================================
-- 9. CRM (025): nếu đã áp thì bắt buộc bật RLS; chỉ admin đọc/ghi qua client
-- ===================================================================================
do $$
declare t text;
begin
  foreach t in array array['buyers', 'sellers', 'interests', 'deals', 'viewings', 'reminders'] loop
    if to_regclass('public.' || t) is not null then
      execute format('alter table public.%I enable row level security', t);
      execute format('drop policy if exists %I on public.%I', t || '_admin_all', t);
      execute format('create policy %I on public.%I for all using (public.la_admin()) with check (public.la_admin())',
                     t || '_admin_all', t);
    end if;
  end loop;
end $$;

-- ===================================================================================
-- 10. Storage & PostGIS
-- ===================================================================================
update storage.buckets
   set file_size_limit = 10 * 1024 * 1024,
       -- wildcard: bot mirror ảnh với content-type lấy thẳng từ CDN Zalo (zalo-bot.mjs), có thể là heic/webp...
       allowed_mime_types = array['image/*']
 where id = 'anh-zalo';

-- spatial_ref_sys (bảng của PostGIS, RLS tắt, advisor báo ERROR): không cần lộ qua API.
-- Bảng thuộc supabase_admin nên có thể không đủ quyền -> không làm hỏng cả migration.
do $$
begin
  revoke all on table public.spatial_ref_sys from anon, authenticated;
exception when others then
  raise notice 'Bỏ qua spatial_ref_sys: %', sqlerrm;
end $$;


-- --- MIGRATION: 027_thu_quyen_doc_cot.sql ---
-- 027 (22/9/2026): thu quyền ĐỌC CỘT nhạy cảm. CHỈ CHẠY SAU KHI code web của PR audit 22/9 đã deploy.
-- Code cũ select listings.contact_phone bằng anon (trang chi tiết tin) và profiles.* bằng authenticated
-- (/account, popup MoiDienSdt) -> sau 027 các truy vấn đó bị PostgREST trả 42501 cho CẢ truy vấn.
-- Code mới: trang tin dùng LISTING_PUBLIC_COLS + has_contact_phone (026); hồ sơ đọc qua ho_so_cua_toi() (026).
-- Chạy lại được (idempotent).
--
-- LƯU Ý CỘT MỚI CỦA listings: sau 027 anon chỉ đọc được các cột ĐÃ GRANT. Thêm cột mới mà web đọc bằng
-- anon (LISTING_CARD_COLS...) thì phải chạy lại khối grant ở mục 1, không thì PostgREST trả 42501 cho CẢ
-- truy vấn (cùng loại sự cố 015). Tương tự với profiles (mục 2).

-- 1. listings.contact_phone: chỉ người ĐÃ đăng nhập đọc được ("đăng nhập để xem SĐT" trước đây chỉ là che UI)
revoke select on public.listings from anon;
do $$
declare cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'listings' and column_name <> 'contact_phone';
  execute format('grant select (%s) on public.listings to anon', cols);
end $$;

-- 2. profiles.phone: chỉ chủ tài khoản (qua ho_so_cua_toi) và service_role đọc được.
--    license_no GIỮ cho authenticated (quyết định 19/8: số CCHN hiện cho người đã đăng nhập ở /agents).
revoke select on public.profiles from authenticated;
grant select (id, role, full_name, avatar_url, bio, agency_name, license_no, specialties, languages,
              years_experience, is_verified, created_at)
  on public.profiles to authenticated;


-- --- MIGRATION: 028_audit_db_nhe.sql ---
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


-- --- MIGRATION: 029_geo_precision.sql ---
-- 029 (22/9/2026): độ chính xác toạ độ của tin. Chạy lại được. Tương thích code cũ lẫn mới
-- (daily.mjs dò cột này trước khi dùng; code cũ không đọc/ghi cột này).
--
-- Vì sao: seed cũ ghi đè lat/lng hễ giá trị mới khác rỗng -> toạ độ THẬT (trang chi tiết batdongsan,
-- chỉ lấy ở lượt đầu) bị điểm geocode rải theo phường/quận đè ở lượt sau. Đo 22/9 trên DB local:
-- (10.727, 106.713) -> (10.72917, 106.71409); điểm theo quận lệch 1.4 km (p50) - 2.4 km (p90).
--   nguon  = do trang nguồn cung cấp (chotot API, trang chi tiết batdongsan)
--   duong  = geocode theo tên đường
--   phuong = geocode theo phường, rải ±0.0015°
--   quan   = geocode theo quận, rải ±0.008°
--   NULL   = không rõ (hàng trước 029) -> seed coi là "gần như nguồn": chỉ toạ độ nguồn mới được đè
alter table public.listings add column if not exists geo_precision text;
alter table public.listings drop constraint if exists listings_geo_precision_check;
alter table public.listings add constraint listings_geo_precision_check
  check (geo_precision is null or geo_precision in ('nguon', 'duong', 'phuong', 'quan'));

-- chotot: 100% toạ độ đến từ API (kiểm 22/9: 300/300 tin có lat/lng, 0 ngoài khung VN)
update public.listings set geo_precision = 'nguon'
 where source_site = 'chotot' and lat is not null and geo_precision is null;

-- anon đọc listings theo quyền CỘT từ 027 -> cột mới phải grant riêng (không thì select cột này bằng anon lỗi 42501)
do $$
begin
  if not has_table_privilege('anon', 'public.listings', 'SELECT') then
    execute 'grant select (geo_precision) on public.listings to anon';
  end if;
end $$;


-- --- MIGRATION: 030_ro_hang.sql ---
-- 030 (28/9/2026): RỔ HÀNG RADAR - hàng Radar trực tiếp nắm (EvoHome/HiFriendz cho thuê, Thiên Khôi
-- nhà phố bán...). Chạy lại được.
--
-- Vì sao nguồn riêng 'ro_hang' (không dùng 'crawl' / 'agent'):
--   * daily seed + db-prune chỉ đụng source='crawl' -> rổ hàng không bị xoá/hạ 'gone' theo luật tin cào.
--   * 'agent' = người bán tự đăng (bộ lọc "chính chủ tự đăng" dùng nó) -> không trộn.
--   * web tách 2 truy vấn (rổ hàng / còn lại) theo cột này để trộn tỉ lệ ưu tiên rổ hàng.
alter type public.listing_source add value if not exists 'ro_hang';

-- Thông tin NHẠY CẢM của rổ hàng: số nhà thật, toạ độ thật, hoa hồng, số phòng. Bảng listings công khai
-- chỉ giữ bản đã che (địa chỉ "gần 160 Nguyễn Thái Sơn", toạ độ lệch ~60 m) - khách phải gọi Radar
-- mới biết chính xác. Bảng này KHÔNG có policy cho anon/authenticated thường: chỉ admin đọc,
-- ghi bằng service_role (script nhập rổ hàng).
create table if not exists public.listing_ro_hang (
  listing_id    uuid primary key references public.listings(id) on delete cascade,
  partner       text not null,             -- evohome | thienkhoi
  exact_address text,
  exact_lat     double precision,
  exact_lng     double precision,
  commission    text,                      -- "50%" - tuyệt đối không ra web công khai
  unit_code     text,                      -- số phòng / mã căn bên đối tác
  raw           jsonb,
  updated_at    timestamptz not null default now()
);
alter table public.listing_ro_hang enable row level security;
drop policy if exists "ro_hang_admin_read" on public.listing_ro_hang;
create policy "ro_hang_admin_read" on public.listing_ro_hang for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
revoke all on public.listing_ro_hang from anon;


-- --- MIGRATION: 031_su_kien.sql ---
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


-- --- MIGRATION: 032_khach_tim.sql ---
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


-- --- MIGRATION: 033_cay_khu_vuc.sql ---
-- ============================================================================
-- 033 — CÂY KHU VỰC ĐẾM SẴN Ở DB (3/10/2026, egress)
-- lib/geo.ts getAreas() trước đây kéo MỌI tin published (~22.000 dòng, 23 lượt x 1.000 dòng, ~2,6 MB) về
-- server Next rồi mới đếm theo tỉnh/quận/loại. Observability 3/10: 10 truy vấn bị gọi nhiều nhất của cả
-- project đều là lượt kéo này (~30 lần dựng lại/giờ do mỗi bản deploy có cache riêng).
-- Hàm này đếm sẵn trong Postgres, trả 1 jsonb gọn (~100-150 KB):
--   c: [[tỉnh, quận, deal, loại, số tin]...]   w: [[tỉnh, quận, phường]...]   s: [nguồn...]   t: tổng
-- Chỉ service_role gọi (getAreas dùng createAdminClient).
-- ============================================================================
create or replace function public.cay_khu_vuc()
returns jsonb
language sql
stable
set search_path = public
as $$
  select jsonb_build_object(
    'c', (select coalesce(jsonb_agg(jsonb_build_array(province, district, deal, kind, n)), '[]'::jsonb)
          from (select province, district, deal, kind, count(*) as n
                from listings where status = 'published' group by 1, 2, 3, 4) x),
    'w', (select coalesce(jsonb_agg(jsonb_build_array(province, district, ward)), '[]'::jsonb)
          from (select distinct province, district, ward
                from listings where status = 'published' and ward is not null and ward <> '') y),
    's', (select coalesce(jsonb_agg(s), '[]'::jsonb)
          from (select distinct case when source = 'crawl' then coalesce(source_site, 'crawl') else source::text end as s
                from listings where status = 'published') z),
    't', (select count(*) from listings where status = 'published')
  );
$$;
revoke execute on function public.cay_khu_vuc() from public, anon, authenticated;
grant execute on function public.cay_khu_vuc() to service_role;


-- --- MIGRATION: 034_idx_listings_loc.sql ---
-- 034 (3/10): index cho lọc tin công khai theo tỉnh/quận/loại (/search, trang khu vực, tin liên quan).
-- Trước đây không có index nào trên province/district/kind -> mỗi đếm HEAD quét cả bảng.
create index if not exists idx_listings_pub_loc
  on public.listings (province, district, deal, kind) where status = 'published';
create index if not exists idx_listings_pub_deal_first_seen
  on public.listings (deal, first_seen_at desc) where status = 'published';


