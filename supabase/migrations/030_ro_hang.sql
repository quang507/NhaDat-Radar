-- 030 (28/9/2026): RỔ HÀNG RADAR - hàng Radar trực tiếp nắm (EvoHome/HiFriendz cho thuê, Thiên Khôi
-- nhà phố bán...). Chạy lại được.
--
-- Vì sao nguồn riêng 'ro_hang' (không dùng 'crawl' / 'agent'):
--   * daily seed + db-prune chỉ đụng source='crawl' -> rổ hàng không bị xoá/hạ 'gone' theo luật tin cào.
--   * 'agent' = người bán tự đăng (bộ lọc "chính chủ tự đăng" dùng nó) -> không trộn.
--   * web tách 2 truy vấn (rổ hàng / còn lại) theo cột này để trộn tỉ lệ ưu tiên rổ hàng.
alter type public.listing_source add value if not exists 'ro_hang';

-- Thông tin NHẠY CẢM của rổ hàng: số nhà thật, toạ độ thật, hoa hồng, số phòng. Bảng listings công khai
-- chỉ giữ bản đã che (địa chỉ "gần 160 Nguyễn Thái Sơn", toạ độ lệch ~60 m) - khách phải gọi Radar
-- mới biết chính xác. Bảng này KHÔNG có policy cho anon/authenticated thường: chỉ admin đọc,
-- ghi bằng service_role (script nhập rổ hàng).
create table if not exists public.listing_ro_hang (
  listing_id    uuid primary key references public.listings(id) on delete cascade,
  partner       text not null,             -- evohome | thienkhoi
  exact_address text,
  exact_lat     double precision,
  exact_lng     double precision,
  commission    text,                      -- "50%" - tuyệt đối không ra web công khai
  unit_code     text,                      -- số phòng / mã căn bên đối tác
  raw           jsonb,
  updated_at    timestamptz not null default now()
);
alter table public.listing_ro_hang enable row level security;
drop policy if exists "ro_hang_admin_read" on public.listing_ro_hang;
create policy "ro_hang_admin_read" on public.listing_ro_hang for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);
revoke all on public.listing_ro_hang from anon;
