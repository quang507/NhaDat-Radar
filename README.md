# NhaDat Radar — App thật (Next.js 15 + Supabase)

Sàn nhà đất **bán & cho thuê** có backend thật: **đăng nhập** (email + Google), **đăng tin** (môi giới), **liên hệ** (lead về người bán), **dự án**, feed tổng hợp có AI score + tag nguồn crawl / tự đăng.

> Đã `next build` PASS (9 route + middleware). Chỉ cần cắm Supabase là chạy.

## Tech
Next.js 15 (App Router, TypeScript) · Tailwind · **@supabase/ssr** (auth SSR chuẩn) · Postgres + RLS.

## Cấu trúc
```
src/
  middleware.ts                 # refresh session mỗi request
  lib/supabase/{client,server,middleware}.ts   # 3 Supabase client (browser / server / middleware)
  lib/{types,format}.ts
  components/{Nav,ListingCard}.tsx
  app/
    page.tsx                    # Feed: category rows + tìm kiếm (server, đọc listings)
    auth/                       # Đăng nhập/Đăng ký + Google OAuth + callback
    listings/[id]/              # Trang chi tiết + form Liên hệ (ghi bảng leads)
    dashboard/                  # Người bán: tin của tôi + Đăng tin (RLS: chỉ tin của mình)
    projects/[id]/              # Trang dự án (giống homigo.vn)
supabase/schema.sql             # bảng + RLS + dữ liệu dự án mẫu
supabase/seed.mjs               # nạp 120 tin crawl thật
crawler/crawl.js                # crawler nhadat.vn (Lớp A)
```

## Chạy (5 bước)

**1. Tạo project Supabase** → Project Settings → API, lấy: `Project URL`, `anon key`, `service_role key`.

**2. Chạy schema** — mở Supabase → SQL Editor → dán toàn bộ `supabase/schema.sql` → Run.
(Bật PostGIS: schema đã có `create extension postgis` — Supabase hỗ trợ sẵn.)

**3. Env**
```bash
cp .env.local.example .env.local
# điền NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SITE_URL
```

**4. Nạp 120 tin mẫu**
```bash
npm install
node supabase/seed.mjs        # dùng service_role, chạy ở máy — KHÔNG deploy key này
```

**5. Chạy**
```bash
npm run dev        # http://localhost:3000
```

## Bật đăng nhập Google (tùy chọn)
Supabase → Authentication → Providers → **Google** → bật, dán Client ID/Secret (tạo ở Google Cloud Console, Authorized redirect URI = `https://<project>.supabase.co/auth/v1/callback`).
Trong app, nút "Tiếp Tục Với Google" gọi `signInWithOAuth` → về `/auth/callback`. Nhớ thêm `http://localhost:3000/auth/callback` vào Supabase → Auth → URL Configuration → Redirect URLs.
Đăng nhập email/mật khẩu **chạy sẵn** không cần Google.

## Điểm RLS quan trọng (đã làm đúng)
- `listings`: đọc công khai tin `published`; agent **chỉ insert được tin `source='agent'` của chính mình** (chống giả nguồn crawl). Tin crawl/Zalo do worker `service_role` ghi.
- `leads`: ai cũng gửi liên hệ được; **chỉ agent chủ tin / admin đọc** → không lộ lead.
- `messages`, `favorites`, `appointments`: chỉ người trong cuộc. → không lặp lỗi lộ bảng `users` của homigo.vn.

## Bước tiếp
- Bản đồ: thêm `NEXT_PUBLIC_MAPBOX_TOKEN` + geocode địa chỉ → toạ độ (điền cột `geo`), render Mapbox ở trang chi tiết/tìm kiếm.
- Ảnh: crawler lấy URL ảnh thật đổ vào cột `images[]`.
- Crawler chạy nền theo lịch (xem hướng dẫn tần suất + chống trùng trong hội thoại).
- AI trích field bằng Gemini/Claude thay regex (cột `ai_score`, `poster_role_guess`, `price_flag`).
