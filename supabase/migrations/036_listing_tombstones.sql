-- 036 (26/10/2026): "bia mộ" cho tin bị XOÁ hẳn -> trang tin 301 về trang khu vực thay vì 404.
-- Search Console 26/10: 4.247 URL /listings/<id> báo 404 + phần lớn 521 URL "noindex" - đều là tin crawl đã bị
-- crawler/daily.mjs xoá (tin gone sau 21 ngày, mọi tin crawl không thấy lại sau 45 ngày). Tin GONE còn trong DB thì
-- trang đã 301 về khu vực (khuVucCuaTin); xoá rồi thì mất luôn tỉnh/quận nên chỉ còn 404 -> mất uy tín SEO của URL.
--
-- Trigger BEFORE DELETE ghi lại id + khu vực, nên MỌI đường xoá (daily.mjs, admin, migration dọn 024) đều có bia mộ,
-- không phải sửa từng chỗ. Mỗi dòng ~100 byte; tin xoá TRƯỚC migration này thì không cứu được (vẫn 404).
-- Chạy lại được (idempotent). Chạy TRƯỚC hay SAU khi deploy code đều được: code đọc bảng lỗi thì giữ 404 như cũ.

create table if not exists public.listing_tombstones (
  id         uuid primary key,
  deal       text,
  kind       text,
  province   text,
  district   text,
  deleted_at timestamptz not null default now()
);

-- chỉ là khu vực của tin đã công khai trước đó -> anon đọc được (trang tin dùng client anon có cache)
alter table public.listing_tombstones enable row level security;
drop policy if exists tombstones_read on public.listing_tombstones;
create policy tombstones_read on public.listing_tombstones for select to anon, authenticated using (true);
grant select on public.listing_tombstones to anon, authenticated;

create or replace function public.ghi_bia_mo_tin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.listing_tombstones (id, deal, kind, province, district)
  values (old.id, old.deal::text, old.kind::text, old.province, old.district)
  on conflict (id) do nothing;
  return old;
end $$;

drop trigger if exists trg_bia_mo_tin on public.listings;
create trigger trg_bia_mo_tin before delete on public.listings
  for each row execute function public.ghi_bia_mo_tin();
