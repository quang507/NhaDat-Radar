-- 041 (11/11/2026): Khoá quyền EXECUTE công khai cho hàm trigger/event SECURITY DEFINER
-- Ghi chú về public.spatial_ref_sys:
--   Đây là bảng danh mục hệ tọa độ chuẩn (SRID) do extension PostGIS tạo ra, chủ sở hữu là supabase_admin.
--   Role postgres (SQL Editor) không đủ quyền sở hữu để chạy ALTER TABLE ... ENABLE ROW LEVEL SECURITY
--   lên bảng này (`must be owner of table spatial_ref_sys`). Bảng không chứa dữ liệu tin đăng hay người dùng.

revoke execute on function public.ghi_bia_mo_tin() from public, anon, authenticated;

do $$
begin
  execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
exception when others then
  null;
end $$;
