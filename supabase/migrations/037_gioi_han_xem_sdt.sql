-- 037: giới hạn xem SĐT (audit pháp lý 2/11, Luật 91/2025 Điều 7 khoản 5, Điều 9)
--
-- Trước: 027 chỉ thu quyền anon đọc listings.contact_phone; mọi tài khoản đã đăng nhập (đăng ký email miễn
-- phí) vẫn `select contact_phone from listings` được cho TẤT CẢ tin qua REST -> "đăng nhập để xem SĐT"
-- không chặn được việc tải hàng loạt, trái với cam kết trong Chính sách bảo mật.
-- Sau: authenticated mất quyền đọc cột; SĐT chỉ lấy qua RPC lay_sdt_tin(id), tối đa 30 tin khác nhau
-- mỗi ngày mỗi tài khoản (xem lại tin đã xem trong ngày không tính thêm). Chủ tin + admin không giới hạn.
--
-- Thứ tự deploy: chạy migration này TRƯỚC hoặc SAU bản web mới đều được - PhoneReveal gọi RPC trước,
-- RPC chưa có (PGRST202) thì mới select cột như cũ.
--
-- ⚠ Từ nay thêm cột mới vào listings: GRANT SELECT (cot) cho CẢ anon VÀ authenticated (CLAUDE.md mục 6.1),
-- không thì PostgREST trả 42501 cho cả truy vấn.

-- 1. Nhật ký xem SĐT (cũng là bằng chứng ai đã xem số của ai, khi chủ thể dữ liệu hỏi)
create table if not exists public.xem_sdt (
  user_id    uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references public.listings(id) on delete cascade,
  ngay       date not null default (now() at time zone 'Asia/Ho_Chi_Minh')::date,
  created_at timestamptz not null default now(),
  primary key (user_id, ngay, listing_id)
);
alter table public.xem_sdt enable row level security;
drop policy if exists "xem_sdt_admin_read" on public.xem_sdt;
create policy "xem_sdt_admin_read" on public.xem_sdt for select using (public.la_admin());

-- 2. RPC trả SĐT
create or replace function public.lay_sdt_tin(p_listing uuid)
returns text language plpgsql volatile security definer set search_path = public as $$
declare
  uid   uuid := auth.uid();
  hom_nay date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  t     record;
  da_xem int;
begin
  if uid is null then
    raise exception 'can_dang_nhap' using errcode = '42501';
  end if;

  select contact_phone, agent_id, status into t from public.listings where id = p_listing;
  if not found or t.contact_phone is null then
    return null;
  end if;
  if t.agent_id = uid or public.la_admin() then
    return t.contact_phone;
  end if;
  if t.status <> 'published' then
    return null;
  end if;

  if exists (select 1 from public.xem_sdt where user_id = uid and ngay = hom_nay and listing_id = p_listing) then
    return t.contact_phone;
  end if;
  select count(*) into da_xem from public.xem_sdt where user_id = uid and ngay = hom_nay;
  if da_xem >= 30 then
    raise exception 'qua_gioi_han_xem_sdt' using errcode = 'P0001';
  end if;

  insert into public.xem_sdt (user_id, listing_id, ngay) values (uid, p_listing, hom_nay);
  return t.contact_phone;
end $$;
revoke execute on function public.lay_sdt_tin(uuid) from public, anon;
grant execute on function public.lay_sdt_tin(uuid) to authenticated;

-- 3. authenticated: đọc mọi cột listings TRỪ contact_phone (giống khối anon ở 027)
revoke select on public.listings from authenticated;
do $$
declare cols text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into cols
  from information_schema.columns
  where table_schema = 'public' and table_name = 'listings' and column_name <> 'contact_phone';
  execute format('grant select (%s) on public.listings to authenticated', cols);
end $$;

-- Nhật ký chỉ cần cho đối soát gần: dọn > 180 ngày (chạy tay hoặc thêm vào crawler/db-prune.mjs)
-- delete from public.xem_sdt where ngay < current_date - 180;
