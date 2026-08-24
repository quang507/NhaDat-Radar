-- 022 (24/8): bịt lỗ hổng "tự phong admin". Policy profiles_update_self cho user sửa hàng
-- của chính mình nhưng KHÔNG chặn cột nào (with_check null, grant UPDATE toàn bảng cho
-- authenticated), nên bất kỳ ai đăng nhập cũng chạy được qua Supabase client của họ:
--   update profiles set role='admin', is_verified=true where id=auth.uid();
-- -> tự lên admin + tự gắn mác "đã xác minh". Đã kiểm chứng lỗ hổng thật 24/8.
--
-- Vá bằng BEFORE UPDATE trigger: ép role & is_verified giữ nguyên giá trị cũ TRỪ KHI caller
-- là service_role / kết nối trực tiếp (admin action qua createAdminClient, seed, bot,
-- dashboard). Không đụng việc user tự sửa phone/bio/avatar. Đã test:
--   - authenticated tự đổi role/is_verified -> bị ép giữ nguyên; đổi full_name -> vẫn được.
--   - service_role đổi role='agent', is_verified=true -> thành công.
create or replace function public.chan_tu_phong_admin()
returns trigger
language plpgsql
as $$
begin
  if coalesce(auth.role(), current_user) not in ('service_role', 'postgres', 'supabase_admin') then
    new.role := old.role;
    new.is_verified := old.is_verified;
  end if;
  return new;
end;
$$;

drop trigger if exists chan_tu_phong_admin on public.profiles;
create trigger chan_tu_phong_admin
  before update on public.profiles
  for each row execute function public.chan_tu_phong_admin();
