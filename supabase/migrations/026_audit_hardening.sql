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
