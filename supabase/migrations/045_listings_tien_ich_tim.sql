-- 045 (17/11/2026): bo loc tien ich cua /search tra cot rieng thay vi quet chu trong mo ta.
--
-- Truoc: moi tien ich = amenities chua khoa HOAC 8 dieu kien ilike tren description/title, chay 5 lan cho moi
--   luot tim chua co cache (3 phep dem + 2 danh sach). Phai doc mo ta (TOAST) cua ca ~16.700 tin thue HCM:
--   do 17/11 mat 1-2 giay moi truy van khi am, luot dau sau khi DB nghi bi huy vi qua 3 giay cua role anon
--   (57014) -> /search?ti=... mat 4-5 giay hoac ra rong.
-- Gio: DB tu tinh khoa tien ich vao listings.tien_ich_tim moi khi tin duoc ghi (trigger), cung luat voi
--   tienIchCua() trong src/lib/tien-ich.ts. /search loc `tien_ich_tim @> {khoa}`; phep dem di index-only.
--
-- KHONG ghi khoa suy tu chu vao cot amenities: trang tin dung amenities de ghi "Thu cung: duoc nuoi",
--   "Cho dau xe: Co" va hien o tien ich - khoa suy tu mo ta ("khong nuoi thu cung" van khop) se thanh sai.
--
-- Bang khoa/cum tu duoi day PHAI khop TIEN_ICH trong src/lib/tien-ich.ts (tests/unit/tien-ich-db.spec.ts bat lech).
--   Doi TIEN_ICH -> viet migration moi: create or replace ham nay + chay lai cau UPDATE ghi lai cot.
--
-- Idempotent (chay lai duoc). Hoan tac: drop trigger trg_listings_tien_ich; drop index
--   idx_listings_pub_prov_deal_src_seen_id_ti va idx_listings_pub_prov_deal_khac_seen_id; tao lai
--   idx_listings_pub_prov_deal_src_seen (migration 042);
--   alter table public.listings drop column tien_ich_tim.

-- 1. Cot moi. Co default hang so -> chi doi metadata, khong ghi lai bang.
alter table public.listings add column if not exists tien_ich_tim text[] not null default '{}';

-- CLAUDE.md muc 6.1: listings cap quyen theo tung cot, thieu dong nay la 42501 ca trang.
grant select (tien_ich_tim) on public.listings to anon, authenticated;

-- 2. Ham tinh khoa tien ich cua mot tin (cung luat tienIchCua): amenities chua khoa moi/khoa cu,
--    HOAC anh co clip (rieng khoa video), HOAC tieu de/mo ta co mot trong cac cum tu.
create or replace function public.tinh_tien_ich(p_title text, p_description text, p_amenities text[], p_images text[])
returns text[]
language sql immutable parallel safe
set search_path = ''
as $fn$
  with c as (select lower(coalesce(p_title, '') || ' ' || coalesce(p_description, '')) as chu)
  select coalesce(array_agg(t.k order by t.thu_tu), '{}'::text[])
  from c, (values
    (1, 'video', null::text, array['youtu.be', 'youtube.com', 'zalo.video', '.mp4']),
    (2, 'thu_cung', 'pet', array['thú cưng', 'nuôi chó', 'nuôi mèo', 'pet']),
    (3, 'gac_lung', null::text, array['gác lửng', 'gác xép', 'có gác', 'duplex']),
    (4, 'gio_tu_do', null::text, array['giờ tự do', 'không chung chủ', 'riêng chủ', 'tự do']),
    (5, 'ban_cong', null::text, array['ban công']),
    (6, 'thang_may', 'elevator', array['thang máy']),
    (7, 'dieu_hoa', 'ac', array['điều hòa', 'điều hoà', 'máy lạnh']),
    (8, 'de_xe', 'parking', array['để xe', 'giữ xe', 'hầm xe']),
    (9, 'hem_xe_hoi', null::text, array['hẻm xe hơi', 'hxh', 'ô tô', 'oto', 'xe hơi đỗ']),
    (10, 'nuoc_nong', null::text, array['nước nóng', 'nóng lạnh']),
    (11, 'tu_lanh', null::text, array['tủ lạnh']),
    (12, 'may_giat', null::text, array['máy giặt']),
    (13, 'ke_bep', null::text, array['kệ bếp', 'tủ bếp', 'bếp riêng']),
    (14, 'tivi', null::text, array['tivi', 'ti vi', 'smart tv']),
    (15, 'tu_quan_ao', null::text, array['tủ quần áo', 'tủ áo']),
    (16, 'giuong', null::text, array['giường']),
    (17, 'san_phoi', null::text, array['sân phơi', 'chỗ phơi']),
    (18, 'an_ninh', 'security', array['an ninh', 'camera', 'bảo vệ', 'vân tay']),
    (19, 'cua_so', null::text, array['cửa sổ']),
    (20, 'bon_rua', null::text, array['bồn rửa', 'chậu rửa']),
    (21, 'xe_dien', null::text, array['xe điện', 'sạc xe'])
  ) as t(thu_tu, k, am, tu)
  where coalesce(p_amenities, '{}'::text[]) @> array[t.k]
     or (t.am is not null and coalesce(p_amenities, '{}'::text[]) @> array[t.am])
     or (t.k = 'video' and exists (
           select 1 from unnest(coalesce(p_images, '{}'::text[])) as u(url)
           where split_part(split_part(u.url, '?', 1), '#', 1) ~* '\.(mp4|mov|m4v|webm|avi|3gp|mkv)$'))
     or exists (select 1 from unnest(t.tu) as w(cum) where strpos(c.chu, w.cum) > 0)
$fn$;

-- 3. Trigger: moi nguon ghi (crawler, ro hang, bot Zalo, tin tu dang) deu tu co cot nay, khong phai sua tung noi.
create or replace function public.trg_listings_tien_ich()
returns trigger
language plpgsql
set search_path = ''
as $fn$
begin
  new.tien_ich_tim := public.tinh_tien_ich(new.title, new.description, new.amenities, new.images);
  return new;
end
$fn$;

drop trigger if exists trg_listings_tien_ich on public.listings;
create trigger trg_listings_tien_ich
  before insert or update of title, description, amenities, images on public.listings
  for each row execute function public.trg_listings_tien_ich();

-- 4. Ghi lai cho tin dang co (chi dong nao lech moi bi dung).
update public.listings
   set tien_ich_tim = public.tinh_tien_ich(title, description, amenities, images)
 where tien_ich_tim is distinct from public.tinh_tien_ich(title, description, amenities, images);

-- 5. Index cho /search (do bang EXPLAIN 17/11):
--    a) Phep dem "tin thue HCM co gac lung": index-only scan, loc tien_ich_tim ngay tren index (INCLUDE),
--       khong mo heap/TOAST: 8,6 ms / 463 trang (truoc: 1-2 giay, quet mo ta).
--    b) Danh sach 14 tin thuong + 6 tin ro hang, ORDER BY first_seen_at desc nulls last, id: index phai co
--       DUNG thu tu do (them id lam khoa cuoi) thi Postgres moi dung lai sau vai dong. Truoc day no doc het
--       ~16.800 tin roi sort: 11.857-15.788 trang, co luc 6,7 giay (qua han 3s cua anon). Sau: 16 trang, 2,3 ms.
--       Dieu kien: province phai la "=" (src/app/search/page.tsx), in() 1 phan tu van bi quet het.
--    Index cu idx_listings_pub_prov_deal_src_seen (042) trung khoa -> bo.
create index if not exists idx_listings_pub_prov_deal_src_seen_id_ti
  on public.listings (province, deal, source, first_seen_at desc nulls last, id)
  include (tien_ich_tim)
  where status = 'published';

create index if not exists idx_listings_pub_prov_deal_khac_seen_id
  on public.listings (province, deal, first_seen_at desc nulls last, id)
  where status = 'published' and source <> 'ro_hang';

drop index if exists public.idx_listings_pub_prov_deal_src_seen;
drop index if exists public.idx_listings_pub_prov_deal_src_seen_ti;

-- SAU KHI chay file nay, chay RIENG: vacuum (analyze) public.listings;
