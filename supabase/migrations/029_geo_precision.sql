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
