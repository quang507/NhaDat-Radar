-- 046 (17/11/2026): cot "gon" cho cac truy van DANH SACH - giam egress Supabase.
--
-- Vi sao: goi Free 5 GB egress/ky, het an han 07/11 -> vuot la request tra 402 (web khong doc duoc du lieu).
--   17/11 da dung 3,975 GB sau 10 ngay. Nhat ky 24 gio: ~13.000 luot GET /rest/v1/listings tu may chu Vercel
--   de dung trang. Do kich thuoc: 4 danh sach tin lien quan cua mot trang tin = 77 KB, trong do mang images
--   (10-15 URL moi tin) chiem 58 KB du the chi dung 1 anh; mot trang /search = 61 KB, images 32 KB + mo ta 12 KB
--   du the chi dung 4 anh va 160 ky tu.
-- Sua: DB giu san ban gon, tu tinh moi khi tin duoc ghi (trigger):
--   anh_bia    text[]  anh dau tien (0-1 phan tu) - the doc ListingCard, ban do
--   anh_the    text[]  4 anh dau - the ngang ListingRow o /search
--   so_anh     int     so anh that (khong tinh video) - nhan "N anh"
--   co_video   bool    images co clip
--   mo_ta_ngan text    240 ky tu dau cua mo ta (the hien 160; du 80 de cheSoTin che SDT truoc khi cat)
--   Cung luat voi gonChoDanhSach() trong src/lib/img.ts. src/lib/cols.ts lay cac cot nay duoi ten cu
--   (images:anh_bia, description:mo_ta_ngan) nen component khong doi. Trang chi tiet van doc images/description.
--
-- Idempotent (chay lai duoc). Hoan tac: drop trigger trg_listings_cot_gon; alter table public.listings
--   drop column anh_bia, drop column anh_the, drop column so_anh, drop column co_video, drop column mo_ta_ngan.

-- 1. Cot moi (default hang so -> chi doi metadata, khong ghi lai bang).
alter table public.listings
  add column if not exists anh_bia text[] not null default '{}',
  add column if not exists anh_the text[] not null default '{}',
  add column if not exists so_anh integer not null default 0,
  add column if not exists co_video boolean not null default false,
  add column if not exists mo_ta_ngan text;

-- CLAUDE.md muc 6.1: listings cap quyen theo tung cot, thieu dong nay la 42501 ca trang.
grant select (anh_bia, anh_the, so_anh, co_video, mo_ta_ngan) on public.listings to anon, authenticated;

-- 2. Anh khong phai video, giu thu tu (duoi video PHAI khop LA_VIDEO trong src/lib/img.ts - tests/unit/cot-gon.spec.ts).
create or replace function public.anh_khong_video(p_images text[])
returns text[]
language sql immutable parallel safe
set search_path = ''
as $fn$
  select coalesce(array_agg(t.u order by t.o), '{}'::text[])
  from unnest(coalesce(p_images, '{}'::text[])) with ordinality as t(u, o)
  where split_part(split_part(t.u, '?', 1), '#', 1) !~* '\.(mp4|mov|m4v|webm|avi|3gp|mkv)$'
$fn$;

-- 3. Trigger: moi nguon ghi deu tu co cot gon.
create or replace function public.trg_listings_cot_gon()
returns trigger
language plpgsql
set search_path = ''
as $fn$
declare
  anh text[];
begin
  anh := public.anh_khong_video(new.images);
  new.anh_bia := anh[1:1];
  new.anh_the := anh[1:4];
  new.so_anh := coalesce(array_length(anh, 1), 0);
  new.co_video := new.so_anh < coalesce(array_length(new.images, 1), 0);
  new.mo_ta_ngan := left(new.description, 240);
  return new;
end
$fn$;

drop trigger if exists trg_listings_cot_gon on public.listings;
create trigger trg_listings_cot_gon
  before insert or update of images, description on public.listings
  for each row execute function public.trg_listings_cot_gon();

-- 4. Ghi lai cho tin dang co.
update public.listings l
   set anh_bia = (public.anh_khong_video(l.images))[1:1],
       anh_the = (public.anh_khong_video(l.images))[1:4],
       so_anh = coalesce(array_length(public.anh_khong_video(l.images), 1), 0),
       co_video = coalesce(array_length(public.anh_khong_video(l.images), 1), 0) < coalesce(array_length(l.images, 1), 0),
       mo_ta_ngan = left(l.description, 240)
 where (l.images <> '{}' or l.description is not null)
   and (l.anh_the = '{}' and l.mo_ta_ngan is null);

-- SAU KHI chay file nay, chay RIENG: vacuum (analyze) public.listings;
