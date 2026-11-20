# Web NhaDat Radar chạy trên máy 146 (thay Vercel, từ 20/11/2026)

Vercel Hobby khoá dự án `nha-dat-radar` ngày 19/11/2026 đến 19/12 (vượt Active CPU 4h12/4h, ISR Writes 706K/200K,
Fast Origin Transfer 10,39/10 GB; khách thật chỉ ~500K request/30 ngày). Web chuyển sang tự chạy trên máy Windows
`NguyetTu` (192.168.1.146, ssh `nguye@192.168.1.146` hoặc `nguye@nuc`), phía trước là Cloudflare Tunnel (miễn phí).

```
Khách → Cloudflare (DNS + CDN + HTTPS) → cloudflared (máy 146, kết nối đi ra, không mở cổng) → Next.js :3000 (127.0.0.1)
```

## Thành phần trên máy 146

| Thứ | Ở đâu | Chạy thế nào |
|---|---|---|
| Mã web (bản sao riêng, không đụng `C:\radar\NhaDat-Radar` của bot Zalo / rổ hàng) | `C:\radar-web\NhaDat-Radar` | `git fetch` + `reset --hard origin/main` |
| Biến môi trường web (chỉ biến web cần) | `C:\radar-web\NhaDat-Radar\.env.production.local` | không commit; NEXT_PUBLIC_* được nhúng lúc build |
| Server | Task `Radar Web` → `C:\radar-web\radar_web.cmd` | SYSTEM, bật lúc khởi động máy, `next start -p 3000 -H 127.0.0.1`, chết thì chạy lại sau 5 s |
| Tự deploy | Task `Radar Web deploy` → `deploy_web.ps1` | 5 phút/lần: có commit mới trên `main` và có file web đổi thì build + chạy lại, lỗi thì trả bản cũ + nhắn Telegram |
| Log | `C:\radar-web\logs\web.log`, `deploy.log` | tự xoay vòng khi > 50 MB / 5 MB |
| Tunnel | Task/dịch vụ `cloudflared` | xem mục Cloudflare |

Các script gốc nằm ở thư mục này (`deploy/may-146/`); bản chạy thật ở `C:\radar-web\`. Sửa ở đây rồi `scp` sang.
Đăng ký task: `dang-ky-task-web.ps1` (task deploy đăng ký ở trạng thái TẮT: `schtasks /Change /TN "Radar Web deploy" /Enable`).

Lệnh hay dùng (qua ssh, shell là cmd):
- Trạng thái: `schtasks /Query /TN "Radar Web"` · `type C:\radar-web\logs\web.log` · `type C:\radar-web\logs\deploy.log`
- Ép build lại: `powershell -ExecutionPolicy Bypass -File C:\radar-web\deploy_web.ps1 -Ep`
- Khởi động lại server: `schtasks /End /TN "Radar Web"` rồi `schtasks /Run /TN "Radar Web"`
- Thử cục bộ: `curl.exe -s -o NUL -w "%{http_code}\n" http://127.0.0.1:3000/`

## Lưu ý vận hành

- **Ổ C chỉ còn ~12 GB** (cả máy dùng chung với GateMonitor): `.next` ~0,3–0,5 GB, `node_modules` ~0,5 GB, cache ISR trên đĩa lớn dần
  (`.next\server\app`). Theo dõi định kỳ; quá 3 GB thì xoá `.next\cache` và `.next\server\app\*.html` rồi chạy `deploy_web.ps1 -Ep`.
- Build chiếm 1–2 GB RAM và vài phút CPU: tránh giờ GateMonitor đông xe nếu có thể. Windows Update tự khởi động lại máy
  (06/11, 11/11): các task tự chạy lại.
- `deploy_web.ps1` chỉ build khi file web đổi (cùng danh sách với `scripts/vercel-bo-qua.sh`): đổi crawler/docs/tests không tốn build.
- Không còn Vercel: không có preview theo PR và workflow `e2e.yml` (sự kiện `deployment_status`) không tự chạy sau deploy nữa;
  chạy tay `npx playwright test tests/e2e/smoke.spec.ts --project=desktop` hoặc dựa vào chuông `Radar Canh production` (30 phút/lần).
- Hết pause Vercel (19/12) mà dự án Vercel còn nối GitHub thì nó sẽ build lại mỗi lần push: nên ngắt kết nối Git hoặc xoá dự án Vercel.

## Cloudflare Tunnel + DNS (làm một lần)

DNS hiện ở `vclouddns.com` (Vinahost). Tunnel chỉ gắn tên miền nằm trên Cloudflare nên phải chuyển DNS sang Cloudflare:

1. Cloudflare (gói Free) → **Add a domain** `nhadatradar.com` → giữ nguyên các bản ghi nó quét được (kiểm MX/TXT nếu có), **xoá** bản ghi trỏ Vercel
   (`A 216.198.79.1`, `CNAME www → cname.vercel-dns.com`).
2. Ở nơi quản lý tên miền (Vinahost) đổi **nameserver** từ `danang.vclouddns.com` / `hoian.vclouddns.com` sang 2 NS Cloudflare đã cho. Chờ Cloudflare báo **Active**.
3. Trên máy 146: cài `cloudflared`, `cloudflared tunnel login` (mở link in ra, chọn `nhadatradar.com`), `cloudflared tunnel create radar-146`,
   `cloudflared tunnel route dns radar-146 www.nhadatradar.com` và `... nhadatradar.com`, cấu hình ingress `http://127.0.0.1:3000`, `cloudflared service install`.
4. (Nên) Cloudflare → Caching → Cache Rules: *Eligible for cache*, Edge TTL **Use cache-control header if present** cho `www.nhadatradar.com`
   (trừ `/api/*`, `/auth*`, `/search*`, `/dashboard*`, `/admin*`): trang ISR của Next gửi `s-maxage`, Cloudflare giữ HTML nên máy 146 ít bị gọi.
5. Apex → www: do `next.config.mjs` (redirect theo host) lo, không cần Redirect Rule.
