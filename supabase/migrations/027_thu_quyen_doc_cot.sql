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
