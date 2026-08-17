# NhaDat Radar - Tài liệu dự án (handoff)

> Sàn nhà đất bán & cho thuê: **crawl đa nguồn → AI Gemini chuẩn hoá/chấm điểm → hiển thị theo tin + bản đồ**.
> Gộp mô hình aggregator (homigo.life) + marketplace/dự án (homigo.vn). Chạy thật, tự cào mỗi ngày.

Đọc file này là nắm toàn bộ để tiếp tục làm ở session Claude khác.

---

## 1. Link quan trọng
| | |
|---|---|
| **GitHub repo** | https://github.com/quang507/NhaDat-Radar |
| **Web live (Vercel)** | https://nha-dat-radar-rkyn.vercel.app |
| **Supabase project** | `dlpedtfmbtuxmgrdnhij` · https://dlpedtfmbtuxmgrdnhij.supabase.co |
| ~~Apify~~ | ĐÃ BỎ 17/8 — FB cào bằng Playwright + cookie clone ở máy nhà (miễn phí) |

## 2. Trạng thái hiện tại (cập nhật 2026-08-14)
- **448 tin thật** từ 5 nguồn: Chợ Tốt 198 · Batdongsan 123 · nhadat 82 · Mogi 30 · Facebook 15.
- **366 tin có ảnh · 447 có toạ độ (map) · 30 dự án thật** (crawl từ batdongsan/du-an).
- Web live, crawl tự động chạy (GitHub Actions - workflow "Daily crawl" Success).

## 3. Tech stack
| Lớp | Công nghệ |
|---|---|
| Frontend/Backend | **Next.js 15** (App Router, TS) + Tailwind |
| DB + Auth | **Supabase** (Postgres + PostGIS + RLS) |
| Bản đồ | **Leaflet + OpenStreetMap** (free; có `NEXT_PUBLIC_MAPBOX_TOKEN` thì dùng Mapbox) |
| AI | **Google Gemini** `gemini-flash-lite-latest` (xoay tối đa 5 key) |
| Crawler | Node (fetch/HTML parse) + Playwright (FB, batdongsan) |
| Deploy | **Vercel** (web) + **GitHub Actions** (crawl cron) + **Supabase** (DB) |
| Font | Lora (display) + Inter (body), màu chủ đạo xanh `#2563eb` |

## 4. Cấu trúc repo
```
nhadat-radar-app/
  src/
    app/
      page.tsx                     # Trang chủ: hero + dự án/BĐS nổi bật + cách hoạt động + vì sao chọn + testimonial + danh mục + CTA
      search/                      # Tìm kiếm hoàn chỉnh: lọc tỉnh/quận/phường + giá/DT/PN + sort + map ẩn/hiện (kiểu homigo /search)
      listings/[id]/page.tsx       # Chi tiết tin: gallery ảnh + specs + map thật (ListingMap) + form liên hệ
      projects/[id]/page.tsx       # Chi tiết dự án
      thong-ke/page.tsx            # Bản đồ giá + xếp hạng giá theo quận
      agents/page.tsx              # Danh sách người bán (profiles role=agent) + vì sao chọn
      huong-dan/{mua,ban}/         # Hướng dẫn 7 bước người mua-thuê / người bán (GuidePage dùng chung)
      tinh-lai-vay/page.tsx        # Máy tính lãi vay (annuity) + biểu đồ dư nợ SVG
      ban/page.tsx                 # Landing "Đăng bán BĐS" -> /dashboard/new
      yeu-thich/page.tsx           # Tin đã lưu ♥ (localStorage, không cần login)
      auth/                        # Đăng nhập/Đăng ký (email + Google OAuth) + callback
      dashboard/                   # Người bán: tin của tôi + đăng tin
      api/chat/route.ts            # Chatbot web: Gemini parse câu hỏi -> query Supabase -> trả lời + thẻ tin
      api/zalo/webhook/route.ts    # Bot Zalo OA (ghi tin + hỏi đáp)
    components/  ListingCard, ListingMap, PriceMap, MapResults, Nav, Footer, ChatWidget, FavButton, NavFav, GuidePage
    lib/  supabase/{client,server,middleware,admin}, ai.ts, zalo.ts, format.ts, types.ts
    middleware.ts                  # refresh session Supabase
  supabase/
    schema.sql                     # Bảng + RLS + trigger (chạy 1 lần khi setup mới)
    migrations/001_security_fixes.sql   # ⚠️ VÁ BẢO MẬT - phải chạy trong SQL Editor
    seed.mjs / seed-listings.json  # Nạp tin mẫu (dùng service_role)
  crawler/
    chotot.mjs        # Chợ Tốt - API JSON công khai (có sẵn lat/lng + ảnh + phường). NGON NHẤT.
    mogi.mjs          # Mogi.vn - HTML SSR (fetch qua Cloudflare OK), có ảnh
    batdongsan.mjs    # Batdongsan - Cloudflare (Node fetch bị chặn -> curl HTML rồi --test), có ảnh
    facebook.mjs      # FB: --playwright (cookie clone, máy nhà) | --demo
    geocode-all.mjs   # geocode BÙ mọi tin thiếu toạ độ -> tin nào cũng có map
    merge.mjs         # Gộp tất cả *.json -> combined.json (chuẩn hoá tỉnh + dedupe cross-source)
    daily.mjs         # ORCHESTRATOR: chạy chuỗi crawl -> merge -> geocode-all -> seed Supabase
    fb-cookies.json   # (gitignored) cookies clone FB cho --playwright
  .github/workflows/daily-crawl.yml   # Cron 5h sáng VN mỗi ngày chạy daily.mjs
```

## 5. Luồng dữ liệu (pipeline)
```
Chợ Tốt(API) ─┐
Mogi(HTML)   ─┤
nhadat(HTTP) ─┼─► chuẩn hoá ─► AI Gemini (lọc rác + trích giá/DT/phường + cò/cá nhân + cảnh báo giá)
Batdongsan   ─┤        (chỉ FB cần AI; các nguồn khác đã có field cấu trúc)
Facebook(PW)  ┘
              └─► merge.mjs (dedupe) ─► geocode-all.mjs (bù toạ độ) ─► seed Supabase (delete source=crawl + insert)
                                                                              │
                          Next.js (Vercel) đọc Supabase ◄──────────────────┘
Cron GitHub Actions 5h sáng/ngày = chạy toàn bộ chuỗi trên (daily.mjs)
```

## 6. Cấu hình / Secrets (KHÔNG lưu giá trị ở đây - chỉ vị trí)
**Vercel → Settings → Environment Variables** (cho WEB chạy):
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `NEXT_PUBLIC_SITE_URL` (=domain vercel). Zalo (khi có): `ZALO_APP_ID`, `ZALO_OA_SECRET`, `ZALO_OA_ACCESS_TOKEN`.

**GitHub → Settings → Secrets and variables → Actions** (cho CRAWL tự động):
- Secrets: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `GEMINI_API_KEY2..5` (mỗi key từ 1 acc Google KHÁC = quota riêng).
- Variables: `FB_GROUP_URLS` (mảng JSON `["url1","url2"]` các nhóm BĐS public), `FB_POSTS` (vd 30).

**Local `.env.local`** (gitignored) = như Vercel + thêm `FB_GROUP_URLS`, `ZALO_POST_GROUPS` nếu chạy crawler/bot ở máy.

## 7. Chạy local
```bash
cd nhadat-radar-app
npm install
cp .env.local.example .env.local   # điền key (Supabase URL/anon/service_role + Gemini)
npm run dev                        # http://localhost:3000
# Nạp/làm mới data:
node --env-file=.env.local supabase/seed.mjs     # nạp seed-listings.json
node --env-file=.env.local crawler/daily.mjs     # cào mới tất cả nguồn + seed
```
Setup DB mới: Supabase → SQL Editor → chạy `supabase/schema.sql` rồi `migrations/001_security_fixes.sql`.

## 8. Nguồn crawl - đặc điểm
| Nguồn | Cách | Ảnh | Toạ độ | Tự động? | Ghi chú |
|---|---|---|---|---|---|
| **Chợ Tốt** | API JSON `gateway.chotot.com` | ✅ | ✅ có sẵn | ✅ | Tốt nhất. region: HN=12000 HCM=13000 ĐN=3000 |
| **Mogi** | HTML SSR | ✅ | geocode | ✅ | Node fetch OK |
| **nhadat** | HTTP (vBulletin) | ❌ text-only | geocode | ✅ | Tin chữ, đã ẩn khỏi feed chính |
| **Batdongsan** | curl HTML (Cloudflare) | ✅ | geocode | bán tự động | Node fetch bị chặn -> curl rồi parse; committed batdongsan.json |
| **Facebook** | Playwright + cookie clone (máy nhà) | ✅ | geocode | ❌ CI (IP bị FB chặn) | Miễn phí. Cần nhiều key Gemini né 429. Cổng chất lượng: phải có từ khoá BĐS + SĐT + khu vực |

## 9. Checklist tính năng
✅ Feed đa nguồn + lọc (quận/giá/loại/phòng ngủ) · **trang /search hoàn chỉnh** (tỉnh/quận/phường + sort + ẩn/hiện lọc & map) · chi tiết + gallery + **map thật** · dự án + chi tiết dự án · thống kê giá theo quận (map + bảng) · auth email+Google · đăng tin (RLS) · form liên hệ (leads) · **chatbot web AI** (nút 💬, /api/chat, xoay key Gemini + fallback keyword) · **yêu thích ♥** (localStorage + badge trên Nav) · **/agents** · **hướng dẫn mua & bán** · **máy tính lãi vay** · **landing /ban** · **footer** · trang chủ kiểu homigo (cách hoạt động, vì sao chọn, testimonial, danh mục, CTA) · Zalo OA bot (code) · AI cò/cá nhân + cảnh báo giá ảo + lọc rác · crawl tự động hằng ngày · geocode mọi tin · xoay nhiều key Gemini.

✅ Đợt 2 (2026-08-14): quên mật khẩu + menu mobile ☰ + upload ảnh đăng tin (Storage) + trang cá nhân /account (kiêm hồ sơ người bán -> hiện ở /agents) + favorites sync DB + email báo tin mới (🔔 /search + crawler/alerts.mjs, cần RESEND_API_KEY) + nhắn tin mua-bán /tin-nhan + đặt lịch xem nhà + admin /admin + lịch sử giá (price_history + chart /thong-ke) + /thue-hay-mua (yield theo quận) + SEO (sitemap/robots/OG) + pgvector semantic search (migration 003 + crawler/embed.mjs + fallback chatbot) + FB ưu tiên Playwright (secret FB_COOKIES_JSON) fallback Apify.

⏳ Cần làm nốt: **chạy `migration 001 + 002 + 003`** trong SQL Editor · (tuỳ chọn) secrets `RESEND_API_KEY`, `FB_COOKIES_JSON` · set role=admin cho tài khoản chủ trong Table Editor để dùng /admin.

🔜 Bước 2 (mở rộng): email alert (cần Resend) · đăng ký Zalo OA thật (GPKD) · admin duyệt tin · thêm nguồn · crawl ảnh cho nhadat · tối ưu cache/tốc độ (Vercel ~4s cold start) · UI trau chuốt.

## 10. Lỗi/gotcha đã biết
- **`migration 001` bắt buộc chạy**: nếu chưa, có lỗ hổng tự phong admin qua anon key (trigger đọc role từ metadata + policy profiles không chặn cột role). File: `supabase/migrations/001_security_fixes.sql`.
- **Gemini 429**: key free cạn quota nhanh, quota theo PROJECT (nhiều key cùng project = vô ích). Giải: nhiều acc/project HOẶC bật trả phí (~$1-5/tháng). Code đã xoay `GEMINI_API_KEY..KEY5`.
- **Apify đã bỏ hẳn (17/8)**: trước tốn ~$5/1000 bài. Playwright + cookie ở máy nhà cho nhiều bài hơn (376 bài thô/lượt, có ảnh) mà miễn phí.
- **nhadat & Batdongsan**: Node `fetch` bị Cloudflare chặn với batdongsan (dùng curl). nhadat không có ảnh (tin chữ đời cũ).
- **Facebook cookies/token = credential sống** (`fb-cookies.json`): đã gitignore, KHÔNG bao giờ commit. Dùng acc CLONE cho FB (đừng acc chính).
- **daily seed** `delete source='crawl'` rồi insert -> KHÔNG động tới tin `source in (agent, zalo_oa)` (tin người dùng đăng vẫn giữ).
- Windows: git cảnh báo LF->CRLF (vô hại).

## 11. Tiếp tục ở session Claude mới
- Repo là source of truth. Sửa code trong `src/`, build `npx next build`, commit + push -> Vercel tự deploy.
- Crawl: sửa `crawler/*.mjs`, chạy `node crawler/daily.mjs` (local, cần .env.local) để test.
- Data thật đã ở Supabase; web đọc trực tiếp (force-dynamic).
- Ưu tiên đề xuất tiếp: **email alert** (bước 2 giá trị nhất), rồi Zalo OA thật, rồi admin moderation.
