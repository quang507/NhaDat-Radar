-- ============================================================================
--  005 — Vá lỗ hổng: chặn insert listing trực tiếp qua PostgREST
--  Chạy 1 lần trong Supabase SQL Editor (idempotent).
-- ============================================================================
--
--  VẤN ĐỀ: policy insert cũ (migration 001) chỉ kiểm tra
--    (agent_id = auth.uid() and source = 'agent')
--  và revoke ở 001 chỉ chặn UPDATE — KHÔNG chặn INSERT các cột nhạy cảm.
--  Hệ quả: một user đã đăng nhập có thể gọi thẳng POST /rest/v1/listings bằng
--  anon key, tự đặt status='published', ai_score=100, trust_score=100,
--  poster_role_guess='chu_nha' -> tin lên thẳng không qua duyệt + giả điểm tin cậy.
--
--  CÁCH VÁ: bỏ hẳn quyền insert listings của client. Tin tự đăng đi qua server
--  action createListing (dùng service_role, đã xác thực user + ép giá trị tin cậy).
--  service_role BỎ QUA RLS nên vẫn ghi được; crawler cũng dùng service_role.

drop policy if exists "listings_insert_own" on public.listings;
drop policy if exists "listings_insert_own_agent" on public.listings;

-- Hardening: chặn tự set role/is_verified ngay khi INSERT profile
-- (trigger handle_new_user là security definer nên KHÔNG bị ảnh hưởng).
revoke insert (role, is_verified) on public.profiles from anon, authenticated;
