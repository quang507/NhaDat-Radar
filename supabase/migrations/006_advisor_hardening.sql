-- ============================================================================
--  006 — Vá cảnh báo Supabase advisor (ĐÃ ÁP TRỰC TIẾP qua MCP 2026-08-14,
--  file này chỉ để theo dõi lịch sử — không cần chạy lại).
-- ============================================================================

-- 1) handle_new_user là SECURITY DEFINER nhưng anon/authenticated gọi được qua
--    /rest/v1/rpc -> thu quyền EXECUTE (trigger auth vẫn chạy bình thường).
revoke execute on function public.handle_new_user() from anon, authenticated, public;

-- 2) match_listings: cố định search_path (chống search_path hijack qua RPC).
alter function public.match_listings(vector, int) set search_path = public;
