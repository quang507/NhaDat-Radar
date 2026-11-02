-- 038: khoá ghi qua REST + giới hạn lượt dùng chung (audit 360° 2/11/2026, mục S2/S3/S4/S6). Chạy lại được.
--
-- ⚠ THỨ TỰ DEPLOY: chạy migration này SAU KHI bản web mới đã lên production:
--   * createLead / deLaiSdt / reportListing / dangKyLapPhong / /api/chat ghi leads + listing_reports bằng
--     service role (bản cũ ghi bằng anon/cookie client -> sau 038 bị RLS chặn, MẤT LEAD).
--   * MoiDienSdt.tsx + NhanTinNhaGiaTot.tsx (client) đã chuyển sang server action guiLeadNhanh
--     (src/app/listings/actions.ts). Còn insert thẳng `supabase.from("leads")` ở trình duyệt thì CHƯA chạy mục 2.
--   * rateLimitChung (src/lib/supabase/anon.ts) gọi dem_luot; chưa có hàm thì code tự cho qua (không lỗi).

-- ===================================================================================
-- 1. (S2) listings: không ai sửa qua REST bằng anon/authenticated
-- ===================================================================================
-- Chủ tin từng PATCH được poster_role_guess, first_seen_at, posted_at (tự gắn "chính chủ", tự đẩy tin).
-- Mọi chỗ sửa tin trong code đều đi qua createAdminClient() (admin/actions.ts) - đã soát 2/11.
revoke update on public.listings from anon, authenticated;
drop policy if exists "listings_update_own" on public.listings;

-- ===================================================================================
-- 2. (S3) leads / listing_reports: bỏ quyền insert công khai, chỉ server action (service role) ghi
-- ===================================================================================
-- Trước: ai cũng POST thẳng /rest/v1/leads, /rest/v1/listing_reports, vượt kiểm tra SĐT/độ dài/rate limit ở server.
drop policy if exists "leads_insert_anyone" on public.leads;
drop policy if exists "reports_insert_anyone" on public.listing_reports;

-- ===================================================================================
-- 3. (S4) match_listings: kẹp match_count 1..20 (anon gọi được, trước không giới hạn)
-- ===================================================================================
-- Giữ nguyên chữ ký + kiểu trả về như 003 (create or replace không đổi được kiểu trả về).
create or replace function public.match_listings(query_embedding vector(768), match_count int default 8)
returns table (id uuid, similarity float)
language sql stable set search_path = public, extensions as $$
  select l.id, 1 - (l.embedding <=> query_embedding) as similarity
  from public.listings l
  where l.status = 'published' and l.embedding is not null
  order by l.embedding <=> query_embedding
  limit least(greatest(coalesce(match_count, 8), 1), 20);
$$;

-- ===================================================================================
-- 4. (S6) Giới hạn lượt DÙNG CHUNG mọi instance serverless (trước: chỉ trong RAM từng instance)
-- ===================================================================================
-- Khoá: "chat:<ip>", "valuation:<ip>", "gemini:ngay:<yyyy-mm-dd>" (trần Gemini toàn hệ thống 3.000/ngày).
create table if not exists public.gioi_han_luot (
  khoa    text primary key,
  so_lan  int not null default 0,
  het_han timestamptz not null
);
alter table public.gioi_han_luot enable row level security;
-- không policy nào: anon/authenticated không đọc/ghi được; chỉ service role + hàm dem_luot
revoke all on public.gioi_han_luot from anon, authenticated;

-- Tăng đếm 1 lượt cho khoá, trả true nếu còn trong hạn mức. Cửa sổ cố định: hết hạn thì đếm lại từ 1.
create or replace function public.dem_luot(p_khoa text, p_toi_da int, p_cua_so_giay int)
returns boolean language plpgsql volatile security definer set search_path = public as $$
declare
  n int;
begin
  insert into public.gioi_han_luot as g (khoa, so_lan, het_han)
  values (left(p_khoa, 200), 1, now() + make_interval(secs => greatest(p_cua_so_giay, 1)))
  on conflict (khoa) do update
    set so_lan  = case when g.het_han <= now() then 1 else g.so_lan + 1 end,
        het_han = case when g.het_han <= now() then excluded.het_han else g.het_han end
  returning so_lan into n;

  -- dọn khoá hết hạn thỉnh thoảng (~1% lượt gọi) - bảng không phình theo số IP
  if random() < 0.01 then
    delete from public.gioi_han_luot where het_han < now() - interval '1 hour';
  end if;

  return n <= p_toi_da;
end $$;
revoke execute on function public.dem_luot(text, int, int) from public, anon, authenticated;
grant execute on function public.dem_luot(text, int, int) to service_role;
