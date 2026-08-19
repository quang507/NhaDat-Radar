-- Đồng bộ tên hiển thị khi người dùng đổi tên trên Google
--
-- Vấn đề (19/8): trigger on_auth_user_created chỉ chạy khi INSERT — tức đúng một lần lúc
-- đăng ký. Nó chép raw_user_meta_data->>'full_name' sang profiles.full_name rồi thôi.
-- Người dùng đổi tên tài khoản Google -> lần đăng nhập sau Google gửi tên mới, Supabase
-- cập nhật auth.users, nhưng profiles.full_name vẫn giữ tên cũ từ ngày đăng ký. Web đọc
-- profiles nên hiện tên cũ mãi.
--
-- KHÔNG ghi đè vô điều kiện: trang /account cho người dùng tự đặt tên (đo thật: có tài
-- khoản Google trả "Quang Lê" nhưng profiles để "Lê Quang" — người dùng cố ý sửa). Ghi đè
-- kiểu đó sẽ xoá lựa chọn của họ mỗi lần đăng nhập.
--
-- Quy tắc: chỉ đồng bộ khi tên hiện tại RỖNG, hoặc vẫn đúng bằng tên Google CŨ (nghĩa là
-- người dùng chưa từng tự sửa). Ai đã tự đặt tên thì giữ nguyên vĩnh viễn.
create or replace function sync_ten_tu_oauth() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  ten_moi text := nullif(trim(coalesce(new.raw_user_meta_data->>'full_name',
                                       new.raw_user_meta_data->>'name', '')), '');
  ten_cu  text := nullif(trim(coalesce(old.raw_user_meta_data->>'full_name',
                                       old.raw_user_meta_data->>'name', '')), '');
begin
  if ten_moi is null or ten_moi is not distinct from ten_cu then
    return new;                                   -- tên không đổi -> không đụng gì
  end if;

  update public.profiles p
     set full_name = ten_moi
   where p.id = new.id
     and (coalesce(trim(p.full_name), '') = ''    -- chưa có tên
          or trim(p.full_name) = ten_cu);         -- vẫn là tên Google cũ, chưa tự sửa
  return new;
end $$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of raw_user_meta_data on auth.users
  for each row execute function sync_ten_tu_oauth();
