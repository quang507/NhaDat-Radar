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
