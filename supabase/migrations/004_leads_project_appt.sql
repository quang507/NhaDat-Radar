-- ============================================================================
--  004 — Hoàn thiện: lead theo dự án + index lịch hẹn
--  Chạy trong Supabase SQL Editor (idempotent, an toàn chạy lại nhiều lần).
-- ============================================================================

-- Lead gửi từ trang dự án cần biết "dự án nào" (trước đây listing_id=null nên mất định danh).
alter table leads add column if not exists project_id uuid references projects(id) on delete set null;

-- RLS đọc lead: giữ nguyên chủ tin/admin, KHÔNG mở lead dự án cho người thường
-- (lead dự án chỉ admin đọc — đã đúng vì listing_id null). Không cần policy mới.

-- Truy vấn lịch hẹn của người bán/khách nhanh hơn.
create index if not exists idx_appointments_agent on appointments(agent_id, slot);
create index if not exists idx_appointments_buyer on appointments(buyer_id, slot);

-- Bật realtime cho chat (nếu publication supabase_realtime tồn tại).
do $$ begin
  alter publication supabase_realtime add table messages;
exception when duplicate_object then null; when undefined_object then null; end $$;
