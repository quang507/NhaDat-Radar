# 🏠 NhaDat Radar

**Sàn bất động sản bán & cho thuê chạy thật** — tự động cào tin đa nguồn mỗi ngày, dùng AI Gemini chuẩn hoá & chấm điểm, hiển thị theo tin + bản đồ. Kết hợp mô hình **aggregator** (gom tin từ nhiều nguồn) với **marketplace** (người bán tự đăng tin, quản lý lead, nhắn tin).

> 🌐 Web live: https://nhadatradar.com
> 📊 ~450 tin thật từ 5 nguồn (Chợ Tốt · Batdongsan · Mogi · nhadat · Facebook) · 30 dự án thật · crawl tự động 2 lần/ngày qua GitHub Actions.

---

## ✨ Tính năng

### Cho người mua / thuê
- **Feed đa nguồn** — trang chủ kiểu portal: hero, dự án & BĐS nổi bật, danh mục, cách hoạt động.
- **Tìm kiếm hoàn chỉnh** (`/search`) — lọc tỉnh/quận/phường, giá, diện tích, phòng ngủ, sắp xếp, bật/tắt bản đồ kết quả; hỗ trợ **semantic search** bằng pgvector khi lọc từ khoá thường không đủ.
- **Trang chi tiết tin** — gallery ảnh, thông số, **bản đồ thật** (Leaflet), lịch sử giá, form liên hệ (lead về người bán), đặt lịch xem nhà.
- **Chatbot AI** 💬 — hỏi bằng tiếng Việt tự nhiên ("căn hộ 2PN dưới 3 tỷ ở Cầu Giấy?"), Gemini parse câu hỏi → query Supabase → trả lời kèm thẻ tin.
- **Định giá AI** (`/dinh-gia`) — ước lượng giá từ dữ liệu tin đang có.
- **Thống kê giá** (`/thong-ke`) — bản đồ giá + xếp hạng giá theo quận + biểu đồ xu hướng.
- **Thuê hay mua?** (`/thue-hay-mua`) — so sánh yield thuê/mua theo quận.
- **Máy tính lãi vay** (`/tinh-lai-vay`) — trả góp annuity + biểu đồ dư nợ.
- **Yêu thích ♥** — lưu tin không cần đăng nhập (localStorage), tự sync DB khi đăng nhập.
- **Lưu tìm kiếm + email báo tin mới** 🔔 — có tin khớp bộ lọc là nhận mail (Resend).
- **Hướng dẫn mua & bán** — quy trình 7 bước cho từng phía.

### Cho người bán / môi giới
- **Đăng tin** với upload ảnh (Supabase Storage), quản lý "tin của tôi" trong dashboard — RLS đảm bảo chỉ sửa được tin của mình.
- **Nhận lead** từ form liên hệ + **nhắn tin trực tiếp** với người mua (`/tin-nhan`).
- **Hồ sơ người bán** (`/account`) — hiển thị trên trang danh bạ môi giới `/agents`.
- Landing riêng `/ban` để kéo người đăng tin.

### Vận hành & AI
- **Crawler đa nguồn tự động**: Chợ Tốt (API JSON), Mogi (HTML SSR), Batdongsan (vượt Cloudflare bằng Playwright/curl), nhadat (HTTP), Facebook groups (Playwright + cookie, chạy máy nhà).
- **Pipeline AI Gemini**: lọc tin rác, trích xuất giá/diện tích/phường từ text tự do, phân loại **cò vs cá nhân**, cảnh báo **giá ảo**, chấm điểm tin — xoay tối đa 5 API key để né rate limit.
- **Dedupe cross-source + geocode bù** — mọi tin đều có toạ độ để lên bản đồ.
- **Bot Zalo OA** — đăng tin & hỏi đáp qua Zalo (webhook `/api/zalo`).
- **Trang admin** (`/admin`) quản trị nội dung; chống spam bằng Cloudflare Turnstile.
- **SEO đầy đủ**: sitemap, robots, OG tags, trang landing theo khu vực (`/nha-dat-ban`, `/nha-dat-cho-thue`).

---

## 🛠 Công nghệ

| Lớp | Công nghệ |
|---|---|
| Frontend / Backend | **Next.js 15** (App Router, TypeScript, Server Actions) + **Tailwind CSS** |
| Database + Auth | **Supabase** — Postgres + **PostGIS** (toạ độ) + **pgvector** (semantic search) + RLS + Storage |
| Đăng nhập | Email/password + Google OAuth (`@supabase/ssr`, session refresh qua middleware) |
| Bản đồ | **Leaflet + OpenStreetMap** (miễn phí; tự chuyển Mapbox nếu có token) |
| AI | **Google Gemini** (`gemini-flash-lite-latest`) — chuẩn hoá tin, chatbot, định giá, embedding |
| Crawler | Node.js (fetch/parse HTML) + **Playwright** cho nguồn chặn bot |
| Deploy | **Vercel** (web) + **GitHub Actions** (cron crawl 2 lần/ngày) |
| Khác | Resend (email alert), Zalo OA API, Cloudflare Turnstile, Microsoft Clarity |

---

## 📁 Cấu trúc repo

```
src/
  middleware.ts               # Refresh session Supabase mỗi request
  app/
    page.tsx                  # Trang chủ
    search/                   # Tìm kiếm + lọc + bản đồ kết quả
    listings/[id]/            # Chi tiết tin
    projects/[id]/            # Chi tiết dự án
    thong-ke/  dinh-gia/  thue-hay-mua/  tinh-lai-vay/   # Công cụ & thống kê
    auth/  account/  dashboard/  tin-nhan/  admin/       # Auth, hồ sơ, đăng tin, chat, quản trị
    api/chat/                 # Chatbot AI
    api/valuation/            # API định giá
    api/zalo/webhook/         # Bot Zalo OA
  components/                 # ListingCard, ListingMap, PriceMap, ChatWidget, Gallery, ...
  lib/                        # supabase clients, gemini, geo, format, types, ...
crawler/
  chotot.mjs  mogi.mjs  batdongsan.mjs  facebook.mjs     # Crawler từng nguồn
  merge.mjs   geocode-all.mjs  quality-gate.mjs  embed.mjs
  daily.mjs                   # Orchestrator: crawl → merge → geocode → seed Supabase
  alerts.mjs                  # Email báo tin mới khớp tìm kiếm đã lưu
supabase/
  schema.sql                  # Bảng + RLS + trigger
  migrations/                 # Vá bảo mật + pgvector (BẮT BUỘC chạy sau schema)
  seed.mjs                    # Nạp tin mẫu (service_role)
.github/workflows/daily-crawl.yml   # Cron crawl 09:00 & 15:00 giờ VN
```

## 🔄 Luồng dữ liệu

```
Chợ Tốt (API) ─┐
Mogi (HTML)   ─┤
Batdongsan    ─┼─► chuẩn hoá ─► AI Gemini (lọc rác, trích field, cò/cá nhân, cảnh báo giá)
nhadat (HTTP) ─┤
Facebook (PW) ─┘
        └─► merge (dedupe) ─► geocode bù toạ độ ─► seed Supabase
                                                       │
                     Next.js trên Vercel đọc trực tiếp ◄┘
```

Seed chỉ xoá–chèn tin `source = 'crawl'`; tin người dùng tự đăng (`agent`, `zalo_oa`) luôn được giữ nguyên.

---

## 🚀 Chạy local

**1. Tạo project Supabase** → lấy `Project URL`, `anon key`, `service_role key` (Project Settings → API).

**2. Chạy SQL** — Supabase SQL Editor: chạy `supabase/schema.sql`, sau đó **toàn bộ file trong `supabase/migrations/`** theo thứ tự (migration 001 vá bảo mật, bắt buộc).

**3. Cấu hình env**
```bash
cp .env.local.example .env.local
# Điền: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#       SUPABASE_SERVICE_ROLE_KEY, GEMINI_API_KEY, NEXT_PUBLIC_SITE_URL
```

**4. Cài & nạp dữ liệu mẫu**
```bash
npm install
node --env-file=.env.local supabase/seed.mjs     # nạp tin mẫu
# hoặc cào dữ liệu mới toàn bộ nguồn:
node --env-file=.env.local crawler/daily.mjs
```

**5. Chạy**
```bash
npm run dev        # http://localhost:3000
```

## ⚙️ Crawl tự động (CI)

GitHub Actions (`daily-crawl.yml`) chạy 09:00 & 15:00 giờ VN, hoặc bấm **Run workflow** chạy tay.

Secrets cần thiết (GitHub → Settings → Secrets → Actions): `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY` (thêm `GEMINI_API_KEY2..5` từ các Google account khác nhau để tăng quota). Riêng Facebook phải cào ở máy nhà (`crawl-local.bat`) vì IP GitHub Actions bị FB chặn.

## 📚 Tài liệu thêm

- `PROJECT.md` — tài liệu handoff chi tiết: trạng thái, secrets, gotcha, kế hoạch.
- `crawler/CHAY-TREN-MAY.md`, `crawler/CHAY-24-7.md` — hướng dẫn cào ở máy cá nhân.
- `crawler/ZALO-BOT.md` — thiết lập bot Zalo OA.

## 🔒 Lưu ý bảo mật

- `SUPABASE_SERVICE_ROLE_KEY` chỉ dùng ở server/CI — **không bao giờ** đưa lên client hay commit.
- `crawler/fb-cookies.json` là credential sống, đã gitignore — không commit; dùng account Facebook phụ.
- Bắt buộc chạy `supabase/migrations/001_security_fixes.sql` để vá lỗ hổng tự phong admin.
