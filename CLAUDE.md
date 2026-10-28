# HƯỚNG DẪN KIẾN TRÚC & QUY CHUẨN KỸ THUẬT - NHADATRADAR.COM

Tài liệu này là chỉ dẫn cốt lõi dành cho AI (Claude, Antigravity) và các kỹ sư phát triển làm việc trên kho mã nguồn `Nhadatradar.com`. Mọi thay đổi mã nguồn bắt buộc phải tuân thủ nghiêm ngặt các quy chuẩn dưới đây.

---

## 1. TỔNG QUAN HỆ THỐNG & HẠ TẦNG (ARCHITECTURE)

* **Frontend:** Next.js 15.1.x (App Router, React 19, TypeScript), **Tailwind CSS v3.4.17**.
* **Hosting:** Vercel Global Edge CDN (Hỗ trợ Incremental Static Regeneration - ISR Caching).
* **Cơ sở dữ liệu & Auth:** Supabase PostgreSQL (`nalcvzwsescsxfzsxirg.supabase.co`) với Row Level Security (RLS).
* **Kho dự án nguồn:** Supabase “AI Ơi Nhà Đất” `rqxmmqmctpklqcmbfxuj` (chỉ đọc).
* **Crawler rổ hàng trên NUC công ty (từ 28/10/2026, `ssh quang@nuc` qua Tailscale):**
  * EvoHome + HiFriendz: `~/radar/ro-hang.sh full` (06:00, 11:30, 17:00, 22:00) và `~/radar/ro-hang.sh evohome` (09:00, 14:30, 19:30), chạy bằng systemd `radar-ro-hang@.service` + `radar-ro-hang-full.timer` / `radar-ro-hang-evohome.timer` (Nice 15, CPUQuota 70% để nhường hệ thống gatemonitor cùng máy). Mỗi lượt `git pull` code mới nhất trong `~/radar/NhaDat-Radar`. Log: `~/radar/logs/ro-hang.log`.
  * Chỉ được diệt Chromium của Playwright (`ms-playwright/chromium`): openwa trên NUC cũng chạy Chrome.
  * HiFriendz chỉ đọc lại toà có dấu vân tay đổi (`crawler/private/hifriendz-toa.json`), toà không đổi lấy phòng từ lượt trước; quá 20 giờ hoặc sửa `hifriendz-fetch.mjs` thì tự quét đủ. Ép quét đủ: `HF_QUET_DU=1`.
  * `cron-ro-hang.sh` / `cron-evohome.sh` trong repo là bản cũ của VPS (đường dẫn `/root/work`), không còn lịch nào gọi.
* **VPS `103.126.162.93` (sắp hết hạn) không còn chạy gì của Radar.** Các dịch vụ còn lại trên đó thuộc dự án khác: AOND (`aond-core` FastAPI 127.0.0.1:8000, bridge Zalo `nhadat-bridge*`), `goi-bot`, `stock-bot`.
* **Crawler trên GitHub Actions:** `daily-crawl.yml`, `ro-hang.yml`, `db-prune.yml`, `e2e.yml`.

---

## 2. KỶ LUẬT HIỆU NĂNG & CACHING (PERFORMANCE & ISR)

> [!CAUTION]
> **QUY TẮC SỐNG CÒN:** Tuyệt đối KHÔNG gọi `cookies()`, `headers()` hoặc `searchParams` trực tiếp trong Server Component của các trang công khai (`/` và `/listings/[id]`).

### Tại sao?
Trong Next.js 15, chỉ cần 1 lời gọi `await cookies()` xuất hiện ở Server Component, toàn bộ trang sẽ bị ép sang chế độ **Dynamic SSR (Server-Side Rendering)**. Vercel CDN sẽ gán header `Cache-Control: private, no-store`, vô hiệu hóa toàn bộ bộ đệm ISR, khiến thời gian phản hồi (TTFB) tăng vọt từ **<300ms lên 12s – 18s**.

### Cơ chế phân tầng chuẩn (Server / Client Boundary):
1. **Server Component (Static ISR):**
   * Chỉ phụ trách truy vấn dữ liệu công khai từ Supabase (`layTinCongKhai`, `layTinTrangChu`).
   * Trả về file HTML tĩnh được nén sẵn trên Edge CDN (`revalidate = 1800` cho trang chủ, `revalidate = 3600` cho trang chi tiết).
   * **Route động (Dynamic Routes):** Mọi route động (`/listings/[id]`, `/projects/[id]`...) bắt buộc phải có `generateStaticParams()` để Vercel kích hoạt trọn vẹn bộ đệm ISR Edge Caching.
2. **Client Component (Dynamic Personalization):**
   * Các logic phụ thuộc phiên đăng nhập phải đưa xuống Client Component (`"use client"`):
     * [`PhoneReveal.tsx`](file:///d:/Radarnhadat/src/components/PhoneReveal.tsx): Dùng `@supabase/ssr` browser client trong `useEffect` để kiểm tra đăng nhập và hiển thị SĐT.
     * [`AdminDetailBar.tsx`](file:///d:/Radarnhadat/src/components/AdminDetailBar.tsx): Kiểm tra quyền Admin phía trình duyệt để hiện thanh công cụ ẩn/xóa tin và xem nguồn đối tác.
3. **Bảo vệ Endpoint Revalidate:**
   * Endpoint [`/api/revalidate`](file:///d:/Radarnhadat/src/app/api/revalidate/route.ts) bắt buộc truyền token bí mật qua query `?secret=...` hoặc header `x-revalidate-secret` khớp với `REVALIDATE_SECRET` hoặc `CRON_SECRET`. Nếu không cấu hình biến môi trường, endpoint tự trả về mã lỗi 503 để chống bị người ngoài xả cache bừa bãi.

---

## 3. QUY CHUẨN DESIGN SYSTEM & UI/UX (ZEN KAIZ)

* **Màu sắc chủ đạo (Brand Colors):**
  * Brand Primary: Emerald Green `#059669` (Dark theme: `#10b981`).
  * Neutral Slate: `#0f172a` (Ink), `#334155` (Muted), `#f8fafc` (Surface).
  * Nghiêm cấm dùng gradient tím/hồng hoặc màu neon lòe loẹt kiểu AI tạo sinh.
* **Quy tắc bo góc dứt khoát (Corner Radius):**
  * Khóa cứng bo góc: `rounded-xs` (`2px`) hoặc `rounded-sm` (`4px`) cho các thẻ card, ô nhập liệu và nút bấm.
  * Nghiêm cấm dùng bo tròn mềm `rounded-2xl`, `rounded-3xl` làm mất vẻ cứng cáp và tính kỹ thuật của sản phẩm BĐS.
* **Typography:** Font `Inter` chuẩn dấu diacritics tiếng Việt, không lỗi nhảy font dấu.
* **Công thái học Mobile (Ergonomics & CRO):**
  * Vùng chạm tối thiểu: Chiều cao nút tương tác ≥ `44px`.
  * Nút Zalo và Hotline cố định ở góc dưới màn hình, nằm trọn trong vùng với của ngón cái (Thumb Zone).

---

## 4. QUY CHUẨN NGHIỆP VỤ BĐS & PHỄU CHUYỂN ĐỔI (CRO)

1. **Bảo mật tin rổ hàng (Tuyệt đối không để lộ nguồn):**
   * Cột `source_site` trong bảng `listings` luôn ghi là `"radar"`.
   * Tên đối tác thật (`partner`), địa chỉ chính xác, số phòng và hoa hồng chỉ nằm ở bảng `listing_ro_hang` (bảng này chỉ Admin có quyền đọc).
   * Toạ độ công khai bắt buộc phải đi qua hàm `lechToaDo` (lệch ngẫu nhiên **20 – 35m**, tương đương 5–6 căn nhà) để bảo vệ quyền riêng tư chính chủ và chống môi giới nhảy tin kê giá.
   * Tuyệt đối không để lộ số điện thoại hay địa chỉ thật của rổ hàng đối tác ra API công khai.
2. **Cơ chế nút Zalo (Đặc thù kỹ thuật Zalo Việt Nam):**
   * Đường dẫn `zalo.me/<số>` trên thực tế **bỏ qua tham số `?text=`** trên ứng dụng di động/web.
   * Vì vậy, component `NutZalo` (`src/components/TheoDoi.tsx`) tự động chép sẵn nội dung tin nhắn + mã phòng vào **Bộ nhớ tạm (Clipboard)** của khách; khách mở Zalo chỉ cần bấm **Dán (Paste)** là gửi được ngay.
   * Đồng thời, trên giao diện trang tin phải luôn hiển thị to rõ khối **Mã phòng / Mã căn** (VD: `Mã: e1234567`) để khách chủ động copy hoặc gõ vào khung chat.
3. **Phân loại nguồn tin:**
   * **Tin độc quyền (Rổ hàng FB/Zalo, Evohome, Hifriendz):** Radar là cầu nối duy nhất. Khách liên hệ qua Hotline/Zalo Radar kèm mã phòng.
   * **Tin cào web (Chợ Tốt, Bất Động Sản):** Cho phép xem bài gốc hoặc đăng nhập tài khoản để xem SĐT chính chủ.
4. **Minh bạch 5 loại chi phí:**
   * Bắt buộc bóc tách rõ ràng: Tiền phòng + Tiền điện + Tiền nước + Tiền xe + Phí dịch vụ/quản lý.

---

## 5. SEO & ĐO LƯỜNG CHUYỂN ĐỔI (ANALYTICS)

* **Sơ đồ trang web (Sitemap):**
  * File index: `https://nhadatradar.com/sitemap.xml`.
  * Phân lô tự động: `sitemap-khu-vuc.xml` (chuyên mục, tỉnh/quận, dự án, bài viết, trang pháp lý) và các file `sitemap-tin/[lo].xml` (mỗi lô 5.000 tin).
  * **Xử lý tin đã xóa (Migration 036 - Bảng `listing_tombstones`):** Khi tin bị xóa hẳn khỏi database, trigger `trg_bia_mo_tin` ghi lại ID và khu vực vào bảng bia mộ để trang tin tự động **301 Redirect** về chuyên mục khu vực thay vì trả về lỗi 404, bảo toàn 100% uy tín SEO của Google.
* **Google Analytics (GA4):**
  * Mã đo lường luồng web chính: **`G-FJ8QKCLWJZ`** (chạy song song dự phòng với `G-1XRXV857VE`).
  * Lọc bot: Chặn `navigator.webdriver` tự động để không làm bẩn số liệu từ các công cụ kiểm thử.
  * Bắn sự kiện chuyển đổi: Các thao tác `ndr_xem`, `ndr_zalo`, `ndr_goi`, `ndr_chia_se`, `ndr_luu` được gửi song song về GA4 và bảng `su_kien` trên Supabase.

---

## 6. QUY TẮC BẤT DI BẤT DỊCH TRONG MÃ NGUỒN & HỆ THỐNG

1. **Quyền đọc cột trên Supabase (Column Grants - Migration 027):**
   * Bảng `listings` phân quyền theo từng cột cụ thể. Khi thêm cột mới vào bảng `listings`, **BẮT BUỘC** phải chạy lệnh cấp quyền:
     ```sql
     GRANT SELECT (ten_cot_moi) ON public.listings TO anon, authenticated;
     ```
     Nếu quên chạy lệnh này, toàn bộ trang web sẽ bị sập với lỗi `42501 permission denied for table listings`.
2. **Quy trình Deploy Vercel:**
   * Luôn chạy `npm run build` kiểm tra trước khi commit/push: Trang chủ phải là **`○ (Static)`**, trang chi tiết tin phải là **`● (SSG / ISR)`**. Push vào nhánh `main` là Vercel tự động build và deploy lên production.
3. **Môi trường & Ngôn ngữ Script:**
   * Môi trường crawler và VPS không cài đặt Python. Mọi script tự động hóa, nhập dữ liệu, crawler bắt buộc viết bằng **Node.js** (`.mjs` hoặc `.js`).
   * Nhiều file trong dự án dùng định dạng xuống dòng **CRLF**, giữ nguyên format này khi chỉnh sửa.
4. **Bảo mật biến môi trường:**
   * Tuyệt đối không gửi giá trị mật khẩu hay private key qua chat. Mọi biến bí mật được quản lý tập trung trong Vercel Environment Variables và GitHub Secrets.
