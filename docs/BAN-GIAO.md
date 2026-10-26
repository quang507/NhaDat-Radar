# Bàn giao hệ thống Nhadatradar.com (26/10/2026)

Tài liệu cho đội tiếp nhận (Antigravity). Đọc kèm [`CLAUDE.md`](../CLAUDE.md) (quy chuẩn kỹ thuật). File này KHÔNG chứa mật khẩu/khoá - lấy giá trị trong Vercel / GitHub Secrets / người giao.

---

## 1. Quyền truy cập cần được mời

| Hệ thống | Định danh | Ghi chú |
|---|---|---|
| Mã nguồn | GitHub `quang507/NhaDat-Radar`, nhánh `main` | Push `main` = Vercel tự deploy production |
| Hosting | Vercel project `nhadatradar.com` (team `quang507s-projects`) | Đọc log runtime cần là thành viên team |
| DB + Auth | Supabase `nalcvzwsescsxfzsxirg` (tài khoản `qle888149@gmail.com`) | Migration chạy TAY trong SQL Editor |
| Kho dự án nguồn | Supabase "AI Ơi Nhà Đất" `rqxmmqmctpklqcmbfxuj` | Chỉ đọc (`scripts/nhap-du-an-aioi.mjs`) |
| Đăng nhập Google | Google Cloud project `nhadat-radar` (tài khoản `quanggooner1996@gmail.com`) | Client "Radar web (Supabase)"; branding "Nhà Đất Radar" đã verify + publish 26/10 |
| Google Cloud cũ | project `Quangpr0` (`gen-lang-client-0010758189`) | Dùng chung cho AI Ơi Nhà Đất + 2 app khác. Client cũ của Radar `797157676134-btdi…` đã gỡ redirect URI, giữ lại dự phòng |
| SEO | Google Search Console `nhadatradar.com` | |
| Đo lường | GA4 `G-FJ8QKCLWJZ` (chính) + `G-1XRXV857VE`; Microsoft Clarity "NhaDatRadar" | |
| VPS | `103.126.162.93` (SSH) | Crawler cron, worker tin tức, FastAPI `aioi.server:app` cổng 8000, `goi-bot`, `stock-bot` |
| CI | GitHub Actions: `daily-crawl.yml`, `ro-hang.yml`, `db-prune.yml`, `e2e.yml` | |
| Thiết kế | Figma file Nhadatradar + thư viện ZEN (đã đổi Brand sang Emerald) | |
| Tên miền | Nơi quản lý DNS `nhadatradar.com` | |

## 2. Biến môi trường (chỉ tên)

- **Web (Vercel)**:
  - Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - Site: `NEXT_PUBLIC_SITE_URL`, `REVALIDATE_SECRET` (kiểu Secret, Production)
  - Gemini: `GEMINI_API_KEY`…`GEMINI_API_KEY5`
  - Email: `RESEND_API_KEY`
  - Đo lường, captcha: `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_CLARITY_ID`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
  - AdSense: `NEXT_PUBLIC_ADSENSE_*`
  - Bản đồ: `NEXT_PUBLIC_MAPBOX_TOKEN`, `VIETMAP_API_KEY`
  - Telegram: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET`
- **Crawler/bot (VPS + GitHub Secrets)**:
  - Rổ hàng: `EVOHOME_PHONE`, `EVOHOME_PASSWORD`, `RO_HANG_PARTNER`
  - Facebook: `FB_GROUP_URLS`
  - Zalo: `ZALO_*`
  - Kho nguồn: `AIOI_SUPABASE_URL`, `AIOI_SUPABASE_KEY`
  - Còn lại: các biến `*_PAGES` / `*_GAP_MS` chỉnh nhịp cào
- **Nên đổi sau bàn giao** (đã đi qua nhiều tay): `SUPABASE_SERVICE_ROLE_KEY`, mật khẩu EvoHome, token Telegram.

## 3. Việc dở dang + cách kiểm thử

### 3.1 Migration 036 - 301 cho tin đã xoá (CHƯA CHẠY)

Code đã lên production (commit `ec7cac4`). Thiếu bảng thì trang vẫn 404 như cũ, không hỏng gì.

1. Supabase SQL Editor → dán toàn bộ [`supabase/migrations/036_listing_tombstones.sql`](../supabase/migrations/036_listing_tombstones.sql) → Run.
2. Kiểm tra bằng một bia mộ GIẢ (service role, `node --env-file=.env.local`):
   - Ghi 1 dòng vào `listing_tombstones`: id ngẫu nhiên (uuid chưa có trong `listings`), `deal='cho_thue'`, `kind='phong_tro'`, `province='Hồ Chí Minh'`, `district='Quận 7'`.
   - `curl -sI https://nhadatradar.com/listings/<uuid>` → phải ra **308/301** về trang khu vực (vd `/nha-dat-cho-thue/...quan-7...`), không phải 404.
   - Xoá dòng thử.
   - Lưu ý: kết quả tra bia mộ cache 1 ngày theo id. Dùng uuid mới cho mỗi lần thử.
3. Kiểm trigger: sau lượt `daily.mjs` kế tiếp, `select count(*) from listing_tombstones` phải > 0.
4. 4.247 URL 404 cũ trong Search Console là tin xoá TRƯỚC 036 (không còn khu vực) → không cứu được, để Google tự loại.

### 3.2 Thu quyền cột `source_post_id` (ĐÃ XONG 26/10 - chỉ cần biết)

- anon và authenticated không còn đọc được `listings.source_post_id`. authenticated được cấp lại mọi cột khác bằng lệnh grant theo cột.
- **THÊM CỘT MỚI vào `listings` mà web đọc thì PHẢI chạy lại khối grant cho cả anon (mẫu ở migration 027) lẫn authenticated**. Không làm thì PostgREST trả 42501 cho CẢ truy vấn và trang tin chết.
- Kiểm nhanh: anon `select=id,source_post_id` → 42501. Anon `select=id,source_site,lat,lng` → 200.

### 3.3 Đăng nhập Google

- Chuyển sang client mới ngày 26/10, đã chạy hết luồng thành công (vào `/dashboard`).
- Còn phải làm:
  - Tắt rồi xoá **Client Secret cũ** của client "Radar web (Supabase)" (project `nhadat-radar`), chỉ giữ secret đang dán trong Supabase → Authentication → Providers → Google.
  - Thử đăng nhập bằng cửa sổ ẩn danh: màn Google phải hiện "Nhà Đất Radar" + logo, không còn `supabase.co`.
- Nếu ai gặp 500 ở `/auth`: đóng tab, mở lại rồi đăng nhập. Lần trước không tái hiện được. Muốn bắt lỗi thì cần đọc log Vercel.

### 3.4 Lỗi màn trắng `/dashboard/new` (CHƯA TÌM RA)

- Người dùng báo "Application error: a client-side exception" lúc bấm Đăng tin.
- Không tái hiện được trên Chrome desktop, kể cả chưa đăng nhập, đăng nhập thật, hay giả lập Google Dịch.
- Lấy lỗi thật từ Clarity: Recordings → lọc URL `dashboard/new` → tab JS errors.
- Cân nhắc thêm `app/error.tsx` có nút "Thử lại" và ghi `error.message` về bảng `su_kien` để lần sau có dữ liệu.

### 3.5 SEO / hiệu năng

- Search Console 26/10: 7,48 N trang đã index, 18,2 N chưa:
  - 12.960 "đã phát hiện, chưa lập chỉ mục" → cần thêm liên kết nội bộ tới tin.
  - 130 trang trùng lặp → phòng rổ hàng cùng toà có mô tả gần giống nhau.
  - 260 chuyển hướng + `/search?...` noindex: đúng thiết kế.
- Clarity: INP 800 ms, CLS 0,26 (đều "poor"), LCP 3 s.

### 3.6 Tồn đọng khác

- Dự án Ny'ah Phú Định: chờ link Google Maps để ghim toạ độ.
- Cân nhắc nhập bảng đường/giao lộ (58.413 giao lộ) từ kho AI Ơi để geocode tốt hơn.
- Crawler Mogi (`crawler/mogi-projects.mjs`) còn lưu dự án không ảnh (web đang ẩn); 6 dự án trùng tên.
- Figma: thiếu màn "10 · Lấp phòng"; type scale mobile 24/18/16/15 chưa đồng bộ code.
- `CLAUDE.md` chưa commit và có 2 chỗ sai:
  - Ghi Tailwind v4, thực tế là **3.4.17**.
  - Mục Zalo prefill cần đối chiếu lại code (`NutZalo`, `maPhong`).

## 4. Vận hành

- **Trước khi push**: `npm run build` - trang chủ `○ (Static)`, `/listings/[id]` và `/projects/[id]` `● (SSG/ISR)`.
- **Làm mới cache**: `GET /api/revalidate?secret=<REVALIDATE_SECRET>`, hoặc header `x-revalidate-secret`. Tham số tuỳ chọn `path=` / `tag=`. Thiếu biến thì 503, sai mã thì 401.
- **VPS**:
  - `cron-ro-hang.sh` chạy 4 lượt/ngày, `cron-evohome.sh` 3 lượt/ngày.
  - Mỗi lượt `git pull origin main` → code crawler push lên là lượt sau chạy bản mới.
  - Thay đổi dữ liệu mà crawler phụ thuộc thì push code TRƯỚC, sửa dữ liệu SAU.
- **Dọn tin**: `crawler/daily.mjs` hạ `gone` tin crawl không thấy lại, xoá tin gone sau 21 ngày và mọi tin crawl sau 45 ngày. Từ 036, mỗi lần xoá đều có bia mộ.
- **Môi trường dev**:
  - Máy không có Python → script viết bằng Node.
  - Nhiều file CRLF: sửa bằng script thì chuẩn hoá `\r\n`.
  - Connector Supabase MCP không có quyền vào project Radar → SQL chạy tay, kiểm RLS bằng REST + anon key.

## 5. Quy tắc không được phá

1. **ISR**:
   - Không `cookies()` / `headers()` / `searchParams` trong server component trang công khai.
   - Route động phải có `generateStaticParams() { return [] }`, thiếu thì `revalidate` bị bỏ qua và trang thành `no-store`.
   - Phần theo người xem để ở client component (`PhoneReveal`, `AdminDetailBar`, `NavAuth`).
2. **Tin rổ hàng / độc quyền (`source='ro_hang'`)**:
   - `listings.source_site` luôn là `radar`. Tên đối tác thật (`hifriendz`, `evohome`, `doc_quyen`) CHỈ nằm ở `listing_ro_hang.partner`, một bảng chỉ admin đọc.
   - Địa chỉ thật, toạ độ thật, hoa hồng, SĐT chủ nhà cũng chỉ nằm ở `listing_ro_hang`.
   - Toạ độ công khai PHẢI đi qua `lechToaDo` (`crawler/chung.mjs`, lệch 20-35 m, cố định theo hạt giống). Script nhập tay `scripts/insert-*.mjs` cũng vậy.
   - Liên hệ chỉ qua Hotline/Zalo Radar kèm mã phòng (`maPhong` = "RH" + 6 hex).
3. **Tin cào web**: xem SĐT chính chủ phải đăng nhập. `contact_phone` không cấp cho anon.
4. **Thiết kế**:
   - Emerald `#059669` (dark `#10b981`), bo góc 2-4 px, font Inter.
   - Không gradient tím/hồng, vùng chạm ≥ 44 px.
5. **Quy trình**: hỏi chủ dự án trước khi tạo file mới, xoá file/dữ liệu, hoặc `git push`.
