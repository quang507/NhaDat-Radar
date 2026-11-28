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
- Cập nhật script deploy sau khi sửa ở repo (task chạy bản `C:\radar-web\deploy_web.ps1`, không phải bản trong repo):
  `copy /Y C:\radar-web\NhaDat-Radar\deploy\may-146\deploy_web.ps1 C:\radar-web\deploy_web.ps1`
- Từ 28/11 `deploy_web.ps1` giữ lại file JS/CSS (`.next\static`) của các bản build trước tối đa 30 ngày: Cloudflare
  còn giữ HTML cũ trỏ tới chunk tên cũ, xoá chunk là khách gặp "Application error" (ChunkLoadError).
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

## Cloudflare Tunnel + DNS (đã làm 20/11/2026)

Tên miền đăng ký ở **iNET** (portal.inet.vn); nameserver đã đổi từ `vclouddns.com` sang `ignacio.ns.cloudflare.com` / `saanvi.ns.cloudflare.com`.
Cloudflare (gói Free, tài khoản đăng nhập bằng email chủ web): zone `nhadatradar.com` Active; bản ghi trỏ Vercel (`A 216.198.79.1`, `CNAME www`) đã xoá,
giữ MX/TXT của Resend, xác thực Google và `_vercel`. Hai CNAME `www` và apex trỏ vào tunnel `radar-146` (id `c8bff693-5906-4873-9d92-79f8812c0098`).

| Thứ | Ở đâu |
|---|---|
| `cloudflared.exe` | `C:	oolscloudflared.exe` (tải từ github.com/cloudflare/cloudflared, không tự cập nhật: `--no-autoupdate`) |
| Cấu hình ingress | `C:adar-webcfconfig.yml` (bản gốc `cloudflared-config.yml` ở thư mục này): www + apex → `http://127.0.0.1:3000`, còn lại 404 |
| Chứng chỉ tunnel (bí mật, KHÔNG commit) | `C:adar-webcfc8bff693-….json`; `cert.pem` ở `C:Users
guye.cloudflared` |
| Chạy | Task `Radar Tunnel` → `C:adar-webadar_tunnel.cmd` (SYSTEM, lúc khởi động máy, chết thì chạy lại sau 5 s); đăng ký bằng `dang-ky-tunnel.ps1` |
| Log | `C:adar-weblogscloudflared.log` |

Apex → www do `next.config.mjs` lo (308), không cần Redirect Rule. **Cache Rule (bật 20/11/2026)**: Cloudflare → Caching → Cache Rules, rule "Giu HTML trang cong khai theo cache-control cua Next": Eligible for cache, Edge TTL "Use cache-control header if present, bypass cache if not", chỉ áp cho `www.nhadatradar.com` và KHÔNG áp cho `/api/`, `/auth`, `/search`, `/dashboard`, `/admin`, `/account`, `/tin-nhan`, `/_next/`, `/m/`.
Thời hạn do chính app khai (`revalidate`): trang chủ 6 giờ, trang tin 24 giờ. Muốn tin mới lên trang chủ sớm hơn thì hạ `revalidate` trong `src/app/page.tsx` (không cần đụng Cloudflare). Kiểm: `curl -sI -A "Mozilla/5.0" https://www.nhadatradar.com/ | findstr cf-cache-status` (lần 2 trở đi phải là HIT; `/search`, `/auth` phải là DYNAMIC). Xả cache khi cần: Cloudflare → Caching → Configuration → Purge.
Bộ lọc bot của app trả 403 cho User-Agent mặc định của curl: thử bằng `curl -A "Mozilla/5.0"`.
Đổi/khôi phục: `cloudflared tunnel list`, `cloudflared tunnel route dns radar-146 <host>`; thêm host mới thì sửa `config.yml` rồi `schtasks /End` + `/Run` task `Radar Tunnel`.

## Ảnh bot Zalo: anh.nhadatradar.com (từ 21/11/2026)

Ảnh tin Zalo lưu ở `C:adarmediaanh-zalo<id><n>.webp`, phát bởi task `Radar Media Server` (`C:adarmedia-server.mjs`, 127.0.0.1:8780, Cache-Control 1 năm).
Trước đây phát qua Tailscale Funnel (`nuc.tail19b567.ts.net:8443`); máy nào cài Tailscale thì Chrome hỏi quyền "Access other devices on your local network" vì Tailscale ép tên đó về địa chỉ 100.x.
Nay phát qua tunnel: ingress `anh.nhadatradar.com` -> `http://127.0.0.1:8780` (DNS CNAME do `cloudflared tunnel route dns radar-146 anh.nhadatradar.com`), Cloudflare tự cache ảnh.
Bot đọc `RADAR_MEDIA_BASE_URL` từ `C:adaradar_env.cmd` (mặc định trong `crawler/zalo-bot.mjs` cũng là tên mới). 1.440 tin cũ đã đổi link trong DB (`listings.images`; `anh_bia`/`anh_the` do trigger tự tính lại).
Tailscale Funnel :8443 vẫn bật nhưng không còn ai dùng: tắt được bằng `tailscale funnel --https=8443 off`.

## Chặn máy dò lỗ hổng + theo dõi egress (21/11/2026)

- **Cloudflare WAF (Security > Security rules > Custom rules, 1/5)**: quy tắc "Chan may do lo hong (php env yml git wp-)", hành động Block. Chặn đường dẫn kết thúc bằng `.php .env .yml .yaml .properties .old .bak .sql`, bắt đầu bằng `/.git /.env /.aws /.ssh /wp- /wordpress /phpmyadmin /cgi-bin`, hoặc chứa `/vendor/phpunit`, `phpinfo`, `/laravel/`.
  Lý do: một IP dò lỗ hổng chiếm 61% request (5.990/24 giờ), mỗi lần máy 146 phải dựng trang 404 (0,2-0,9 s CPU). Web không có đường dẫn nào như vậy. Gỡ: xoá quy tắc trên Cloudflare. `/.well-known/` KHÔNG bị chặn.
- **Egress Supabase theo giờ**: migration 050 (job `pg_cron` "ghi-egress-gio", phút 05 mỗi giờ) ghi tổng lượt gọi PostgREST theo nhóm + 30 lệnh gọi nhiều nhất vào `public.egress_snapshot` (30 ngày, chỉ owner đọc).
  Xem theo giờ trong SQL editor: `select ts, nhom, them_luot, them_giay_db, left(chi_tiet, 90) from public.egress_theo_gio where them_luot > 0 order by ts desc, them_luot desc limit 50;`
  Ước egress = lượt gọi x dung lượng nén 1 lượt (danh sách tìm kiếm ~8 KB, chi tiết tin ~13 KB, tin tương tự ~3,5 KB). Hạn mức: 5 GB/chu kỳ 08-08, trang usage: https://supabase.com/dashboard/org/djazbcahuljpevhuvuup/usage
