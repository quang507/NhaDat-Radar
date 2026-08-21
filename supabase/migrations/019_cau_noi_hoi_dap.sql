-- 019 (21/8): hạ tầng "Cầu Nối" - bot Zalo làm trung gian hỏi đáp buyer <-> seller
-- (học mô hình nhadat.CC: AI mặt tiền, người hậu trường; câu trả lời TÍCH LUỸ vào
-- listing_facts để buyer sau hỏi lại thì bot tự trả, không phiền seller lần hai).
--
-- - leads.notified_at: bot poll bảng leads, lead mới thì nhắn Zalo cho admin rồi đóng dấu.
-- - listings.zalo_thread: thread Zalo của NGƯỜI ĐĂNG tin qua bot - có nó mới relay
--   được câu hỏi của buyer sang seller. Tin cào không có -> đi đường admin gọi SĐT gốc.
-- - info_requests: hàng đợi câu hỏi (pending -> answered / admin / expired).
-- - listing_facts: kho hỏi-đáp đã chốt theo tin, ai đọc cũng được (không lộ danh tính).
-- info_requests bật RLS KHÔNG policy = chỉ service role (bot) đọc ghi.
alter table leads add column if not exists notified_at timestamptz;
alter table listings add column if not exists zalo_thread text;

create table if not exists info_requests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id) on delete cascade,
  buyer_thread text not null,
  seller_thread text,
  question text not null,
  status text not null default 'pending',
  answer text,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  answered_at timestamptz
);
alter table info_requests enable row level security;

create table if not exists listing_facts (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id) on delete cascade,
  question text not null,
  answer text not null,
  source text not null default 'seller_zalo',
  created_at timestamptz not null default now()
);
alter table listing_facts enable row level security;
create policy "facts_read" on listing_facts for select using (true);
