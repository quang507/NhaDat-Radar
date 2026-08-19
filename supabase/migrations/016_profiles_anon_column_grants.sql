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
