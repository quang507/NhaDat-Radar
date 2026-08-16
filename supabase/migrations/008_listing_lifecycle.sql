-- 008: vòng đời tin + trường đã tính ở crawler nhưng chưa từng ghi vào DB
-- (học từ mô hình Homigo: firstSeenAt/lastSeenAt/crawlCount/sourceCount + posterSignal có lý do + SĐT che)
alter table listings
  add column if not exists last_seen_at         timestamptz,          -- lần cào gần nhất còn thấy tin
  add column if not exists crawl_count          int not null default 1, -- số lần cào thấy tin
  add column if not exists source_count         int not null default 1, -- số nguồn cùng đăng (dedupe liên nguồn)
  add column if not exists source_sites         text[],               -- các nguồn đó
  add column if not exists phone_masked         text,                 -- "0397 55****" — che 4 số, không phải dữ liệu định danh
  add column if not exists poster_listing_count int,                  -- tài khoản người đăng có bao nhiêu tin trong đợt cào
  add column if not exists poster_reasons       text[] not null default '{}'; -- lý do dấu hiệu môi giới/chính chủ (hiện cho người dùng)

-- Trạng thái mới: tin crawl không còn thấy trên nguồn ≥2 lần cào liên tiếp -> "gone" (ẩn khỏi tìm kiếm, chi tiết vẫn mở kèm nhãn)
alter type listing_status add value if not exists 'gone';

-- (policy đọc tin 'gone' nằm ở 009 — Postgres không cho dùng giá trị enum mới trong cùng transaction)

-- Backfill: coi lần thấy gần nhất = lần cào gần nhất đã ghi
update listings set last_seen_at = coalesce(crawled_at, first_seen_at, created_at) where last_seen_at is null;

create index if not exists idx_listings_source_post on listings(source_site, source_post_id);
create index if not exists idx_listings_first_seen  on listings(first_seen_at desc);
create index if not exists idx_listings_last_seen   on listings(last_seen_at);
