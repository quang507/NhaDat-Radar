# Bàn giao 28-29/10/2026: Vercel cache, dời việc nền sang NUC, bot Zalo

Tóm tắt hai chat Claude Code ("Vercel project migration options" và "Dời dịch vụ từ VPS Vinahost sang máy NUC") cho
chat Antigravity "RadarNhaDat Content Distribution" làm tiếp. Đọc kèm [`CLAUDE.md`](../CLAUDE.md),
[`deploy/nuc/README.md`](../deploy/nuc/README.md), [`crawler/ZALO-BOT.md`](../crawler/ZALO-BOT.md).
Không có giá trị bí mật nào trong file này.

## 1. Đã xong

| Việc | Commit | Ghi chú |
|---|---|---|
| Trang khu vực + trang tin tức không được cache, làm tràn Fast Origin Transfer của Vercel | `4974d6c` | Trang chủ giờ `X-Vercel-Cache: HIT` |
| Dời crawler rổ hàng EvoHome + HiFriendz từ VPS `103.126.162.93` sang NUC công ty | `d30778f`, `8205352` | systemd timer, xem mục 2. VPS đã comment 4 dòng crontab `#NUC#` |
| HiFriendz chỉ đọc lại toà đổi (dấu vân tay toà), quá 20 giờ tự quét đủ | `d30778f` | Lượt đầy đủ ~22 phút → ~4-5 phút. Ép quét đủ: `HF_QUET_DU=1` |
| Bot Zalo (`crawler/zalo-bot.mjs`) chạy 24/7 trên NUC, bỏ pm2 ở máy Windows | `e0d23e4` | `CHAY.bat` giờ chỉ cào Facebook. `KIEM-TRA-ZALO.bat` / `ZALO-LOGIN.bat` làm việc với NUC qua SSH |
| Bot bỏ qua nhóm không phải BĐS (`ZALO_BO_QUA_NHOM` trong `.env.local`) | `e0d23e4` | Mã nhóm KHÔNG để trong repo (repo public) |
| Cấu hình NUC vào repo: `deploy/nuc/` (script, unit systemd, logrotate, `cai-dat.sh`, README) | `8205352` | Xoá `cron-ro-hang.sh` / `cron-evohome.sh` của VPS |
| Đăng phòng rổ hàng lên nhóm Zalo CHO THUÊ theo khu vực (`crawler/zalo-dang-nhom.mjs`) | `fcf5096`, `9df8629` | Mục 3 |
| Hotline duy nhất của Radar: **0387365020** | (DB, không cần commit) | Code đã đúng sẵn (`src/lib/hotline.ts`). Đã sửa DB: 4.770 tin rổ hàng `contact_phone` 0346689460 → 0387365020, 5 mô tả tin nhập tay. 0346 689 460 là số WhatsApp của gatemonitor, KHÔNG phải hotline |

## 2. Hạ tầng hiện tại

- **Web:** Vercel (chưa đổi). **DB:** Supabase `nalcvzwsescsxfzsxirg`.
- **NUC công ty** (`ssh quang@nuc` qua Tailscale, Celeron N3050 2 nhân, RAM 4 GB, Ubuntu 22.04) chạy cho Radar:

  | Việc | Unit | Lịch | Log `~/radar/logs/` |
  |---|---|---|---|
  | Rổ hàng đầy đủ | `radar-ro-hang@full` | 06:00, 11:30, 17:00, 22:00 | `ro-hang.log` |
  | EvoHome nhanh | `radar-ro-hang@evohome` | 09:00, 14:30, 19:30 | `ro-hang.log` |
  | Bot Zalo đọc nhóm | `radar-zalo-bot` | 24/7 | `zalo-bot.log` |
  | Đăng nhóm Zalo | `radar-zalo-dang` | 15 phút/lần 08:30-19:45 | `zalo-dang.log` |
  | Đo CPU/RAM | `radar-do-tai` | mỗi phút | `tai-<ngày>.csv`, tóm tắt `~/radar/tom-tat-tai.sh` |

- NUC còn chạy **gatemonitor** (đếm xe camera, bận nhất 14-17h), **openwa** (WhatsApp, có Chrome), Tailscale Funnel
  `/` → `:8765`. KHÔNG đụng. Việc của Radar nằm trong `radar.slice` `CPUWeight=10` để luôn nhường CPU.
  Không bao giờ `pkill chromium/chrome` trên NUC (chỉ `ms-playwright/chromium`).
- Repo trên NUC: `~/radar/NhaDat-Radar`; mỗi lượt rổ hàng tự `git pull`. Sửa `zalo-bot.mjs` thì phải
  `sudo systemctl restart radar-zalo-bot`. Sửa `deploy/nuc/*` thì chạy lại `deploy/nuc/cai-dat.sh` trên NUC.
- **VPS `103.126.162.93`** (còn ~1 tháng): không còn chạy gì của Radar. Vẫn chạy dự án khác: AOND (`aond-core`
  FastAPI 127.0.0.1:8000 + 2 bridge Zalo `nhadat-bridge*`), `goi-bot`, `stock-bot`. Chưa quyết dời đi đâu.
  Repo trên VPS kẹt ở `919f8b7` (git pull hỏng vì `package-lock.json` sửa tại chỗ) - để nguyên, đó là đường quay lui.

## 3. Bot Zalo: đọc + đăng nhóm

- Acc clone đang dùng: ownId `…2457647` (tên "Lê Quang"). Acc cũ `…9854381` phiên đã chết. Chưa từng dùng số hotline.
- **Đọc:** mọi nhóm acc đang ở, trừ `ZALO_BO_QUA_NHOM`. Tin ≥ 40 ký tự → Gemini → lưu tin nếu là tin BĐS có SĐT
  hoặc khu vực. Bỏ qua tin 1-1; `sendReply` khoá cứng (không trả lời trong chat).
- **Đăng** (`crawler/zalo-dang-nhom.mjs`): chỉ phòng rổ hàng của Radar (`source='ro_hang'`), đúng khu vực + khoảng
  giá + loại phòng của nhóm; mỗi nhóm ≤ 1 tin/ngày, giờ rải ngẫu nhiên 08:30-19:30, cách nhau ≥ 25 phút, ≤ 10 tin/ngày,
  không lặp phòng trong nhóm, không trùng phòng giữa các nhóm trong ngày. Bài gồm giá, diện tích, phường/quận, chi phí
  (điện, nước, phí quản lý, cọc nếu có), nội thất, mã `RHxxxxxx`, link web, hotline. Gửi lỗi → dừng 24 giờ + báo Telegram.
- Cấu hình nhóm ở `crawler/private/zalo-nhom.json` trên NUC (gitignore): `loai` = `thue` / `ca_hai` (được đăng),
  `ban` / `chua_xep` / `cho_duyet` / `bo_qua` (chỉ đọc hoặc bỏ). `khu_vuc`, `kind`, `gia` [triệu]. Trạng thái + lịch sử
  đăng: `crawler/private/zalo-dang-trang-thai.json`.
- Lệnh: `node --env-file=.env.local crawler/zalo-dang-nhom.mjs nhom` (đồng bộ nhóm, thêm nhóm mới dạng `chua_xep`),
  `... --thu` (xem lịch + bài, không gửi).
- **Chưa kiểm được lần gửi thật đầu tiên** (Zalo không cho acc tự gửi cho mình). Lượt đầu ~08:30-11:00 ngày 29/10:
  xem `zalo-dang.log` và nhóm Zalo.

### Nhóm Zalo (29/10)

- Đang ở 7 nhóm: 3 nhóm được đăng (ECOMLAND NHÀ ĐẤT TPHCM, NHÀ ĐẤT SÀI GÒN: toàn TP.HCM; Bcons Full: Dĩ An + Thủ Đức),
  2 nhóm mua bán chỉ đọc (Guland Củ Chi, Bazaland), 2 nhóm riêng bỏ qua (GÓI, Bảo Ngọc - Thanh My).
- Đang vào thêm 19 nhóm tìm trên mạng (17 link khác đã chết): unit tạm `radar-zalo-vao-nhom` trên NUC, mỗi nhóm cách
  12-20 phút, log `~/radar/logs/zalo-vao-nhom.log`, hàng đợi + kết quả `crawler/private/zalo-hang-doi-vao-nhom.json`.
  Vào được thì tự xếp loại vào `zalo-nhom.json`; nhóm cần admin duyệt ghi `cho_duyet` (không đăng) tới khi được nhận.
  Danh sách đầy đủ + nguồn: file `nhom-zalo-tim-duoc.md` trong thư mục ghi chú chung của Claude.
- Nhóm cho thuê Bình Thạnh / Phú Nhuận chia theo mức giá (`gia` đã đặt theo tên thật, vd "2x-3x-4x" = [2, 5]).
  Nhiều nhóm là "giỏ hàng" của môi giới: đăng vào dễ bị mời ra. "PHÒNG CỦA KHOA" (503 người) để chỉ đọc.

## 4. Việc dở / cần quyết

1. **Vercel bị đầy.** Chưa biết hạn mức nào đầy (Fast Origin Transfer / function / ISR). Tài khoản Vercel mà Claude kết
   nối (team `quang507s-projects`) KHÔNG thấy project `nhadatradar.com`, nên chưa xem được Usage. Không nên mở tài khoản
   Hobby khác để lách: Hobby chỉ cho dự án phi thương mại, có thể bị khoá. Hướng: chờ xem `4974d6c` hạ mức dùng; nếu
   vẫn đầy thì Pro (20 USD/tháng, đặt trần chi tiêu) hoặc dời sang Cloudflare Workers (OpenNext, phải kiểm lại ISR).
2. **Theo dõi NUC giờ cao điểm** (14-17h, lượt 11:30 / 17:00): `ssh quang@nuc '~/radar/tom-tat-tai.sh'`. RAM trống
   thường < 500 MB hoặc CPU máy chạm ~200% khi crawler chạy → dời lịch crawler trước, không được thì quay lại VPS.
3. **AOND, goi-bot, stock-bot trên VPS** sẽ chết khi VPS hết hạn: gia hạn VPS nhỏ hoặc dời (AOND phải sửa workflow deploy
   `quang507/AOND` → `apply-migration.yml`, đang SSH vào VPS bằng mật khẩu root).
4. **Đổi khoá bí mật** (`SUPABASE_SERVICE_ROLE_KEY`, mật khẩu EvoHome, token Telegram): `.env.local` đã nằm trên VPS và NUC.
   Đổi xong cập nhật Vercel, GitHub Secrets, `~/radar/NhaDat-Radar/.env.local` trên NUC.
5. **Bot Zalo bớt gọi Gemini:** lọc từ khoá BĐS + bỏ tin trùng giữa các nhóm trước khi gửi Gemini (khi nhóm đông lên).
6. `D:\FBManager` (đăng / comment Facebook bằng nhiều nick + proxy): Claude KHÔNG làm tiếp (spam né kiểm duyệt). Hướng
   thay thế đã đề xuất: báo bài "tìm phòng" từ crawler Facebook về Telegram/admin kèm câu trả lời gợi ý để người trả lời
   bằng nick thật; hoặc soạn sẵn bài nhóm Facebook (chép vào bộ nhớ tạm + mở trang nhóm) để người tự đăng.

## 5. Quy tắc giữ nguyên

- Tin rổ hàng: không lộ số nhà, tên đối tác, hoa hồng, toạ độ thật (xem `CLAUDE.md` mục 4).
- File trong `crawler/private/` và `.env.local` không bao giờ commit (repo public).
- `.bat` phải CRLF; `deploy/nuc/**` và `*.sh` phải LF (`.gitattributes`). Nhiều file `crawler/*.mjs` là CRLF.
- Trước khi push: `npm run build` (trang chủ `○ Static`, `/listings/[id]` `● SSG/ISR`).
