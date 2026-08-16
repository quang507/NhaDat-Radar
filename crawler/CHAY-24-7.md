# Chạy FB + Zalo 24/7 bằng pm2 (FREE trên PC nhà, hoặc VPS)

> **Vì sao PC nhà?** FB & Zalo chặn/khoá IP datacenter (GitHub Actions, VPS nước ngoài).
> PC/laptop nhà bạn dùng **IP dân cư Việt Nam** → an toàn nhất, và **miễn phí** (chỉ tốn điện).
> VPS Việt Nam cũng chạy được nhưng vẫn là IP datacenter (rủi ro cao hơn) — chỉ nên mua nếu không muốn bật PC.

## Ai chạy ở đâu (tối ưu, 100% free)
- **GitHub Actions** (đã có): Chợ Tốt + Mogi + batdongsantoanquoc/bannhadat123/sosanhnha — không cần IP dân cư.
  Batdongsan.com.vn chạy qua Playwright: CI thử trước, bị Cloudflare chặn thì máy nhà cào bù (file cũ quá 2 ngày tự bị bỏ qua).
- **PC nhà bạn** (hướng dẫn này): Facebook + Zalo (+ Batdongsan khi CI bị chặn) — cần IP dân cư VN.
- **nhadat.vn đã chết** (tên miền về VNNIC từ 8/2026) — không còn trong pipeline.

## Cách đơn giản nhất (không cần nhớ lệnh)
- **Bấm đúp `BAT-RADAR.bat`** ở thư mục gốc repo: giao việc cho pm2 + ghi sổ + hiện trạng thái. Chỉ cần làm khi cài máy mới
  hoặc khi `pm2 status` không thấy `zalo-bot` online. Bình thường bật máy là pm2 tự dậy (đã cài `pm2-windows-startup`).
- Máy Sleep = bot ngưng → Settings → Power → *When plugged in, sleep: Never*.
- Cửa sổ cmd đen trống xuất hiện sau khi chạy pm2 = daemon pm2, **đừng đóng**.
- Luôn dùng PowerShell **thường** (không Run as administrator) — admin sinh daemon riêng, hai bên không thấy nhau.
- pm2 = "quản gia": `pm2 status` xem việc · `pm2 logs zalo-bot` xem log · `pm2 restart zalo-bot` bật lại · `pm2 kill` đuổi quản gia (làm lại từ đầu).

## Vòng đời tin (từ 16/8/2026)
- Seed **không xoá-chèn** nữa: tin cũ được cập nhật (`last_seen_at`, `crawl_count`), giữ `first_seen_at` + embedding.
- Tin không thấy lại ≥36h (FB/Batdongsan: 7 ngày) → `status = gone`: ẩn khỏi tìm kiếm, trang chi tiết vẫn mở kèm nhãn "có thể đã giao dịch". Gone quá 30 ngày → xoá.
- Test nhanh không cào: `node --env-file=.env.local crawler/daily.mjs --seed-only`

## Cài 1 lần (Windows / Mac / Linux)
```
git clone https://github.com/quang507/NhaDat-Radar.git
cd NhaDat-Radar
npm install
npx playwright install chromium
npm i -g pm2 zalo-agent-cli
zalo-agent login            # quét QR bằng Zalo CLONE
```
Tạo `.env.local` (copy từ `.env.local.example`, điền SUPABASE + GEMINI + FB_GROUP_URLS + ZALO_POST_GROUPS).
Đặt cookie FB: `crawler/fb-cookies.json` (export Cookie-Editor).

## Chạy nền
```
pm2 start ecosystem.config.cjs      # bật cả 3: zalo-bot (nền) + daily-crawl (5h) + zalo-post (8h,17h)
pm2 logs                            # xem hoạt động
pm2 save                            # lưu để tự chạy lại
pm2 startup                         # (Linux/Mac) tự chạy khi khởi động máy
```
Trên **Windows** để tự chạy khi mở máy: cài thêm `npm i -g pm2-windows-startup` rồi `pm2-startup install`.

## Lệnh hay dùng
| Việc | Lệnh |
|---|---|
| Xem trạng thái | `pm2 status` |
| Xem log | `pm2 logs zalo-bot` |
| Dừng hết | `pm2 stop all` |
| Chạy lại | `pm2 restart all` |
| Cào FB ngay (không đợi 5h) | `pm2 restart daily-crawl` |
| Đăng tin group ngay | `pm2 restart zalo-post` |

## Lưu ý
- **Chỉ dùng acc CLONE** cho FB & Zalo — có thể bị khoá.
- Máy phải **bật** thì pm2 mới chạy. Tắt máy = dừng; mở lại máy pm2 tự chạy tiếp (nếu đã `pm2 save` + startup).
- Không muốn bật PC 24/7 → dùng **Task Scheduler** chạy `crawl-local.bat` 1 lần/ngày (chỉ crawl, không có bot Zalo realtime).
