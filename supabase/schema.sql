-- ============================================================================
--  HOMIGO-STYLE MARKETPLACE — Unified schema (Postgres / Supabase)
--  Gộp 3 nguồn về 1 bảng `listings`: crawl (Lớp A) + agent tự đăng (Lớp B) + Zalo (Lớp C)
--  RLS bật cho MỌI bảng (homigo.vn để lộ bảng users vì thiếu RLS — không lặp lại).
--  Chạy trong Supabase SQL Editor, hoặc: psql "$DATABASE_URL" -f schema.sql
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
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''),
          coalesce((new.raw_user_meta_data->>'role')::user_role, 'user'));
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
