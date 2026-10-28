# Việc nền Nhadatradar trên NUC công ty

Từ 28/10/2026, NUC công ty (`ssh quang@nuc` qua Tailscale, Ubuntu 22.04, Celeron N3050 2 nhân, RAM 4 GB) chạy hai việc
nền của Radar thay cho VPS Vinahost `103.126.162.93`:

| Việc | Unit systemd | Lịch | Log |
|---|---|---|---|
| Rổ hàng EvoHome + HiFriendz (`ro-hang.sh full`) | `radar-ro-hang@full` ← `radar-ro-hang-full.timer` | 06:00, 11:30, 17:00, 22:00 | `~/radar/logs/ro-hang.log` |
| Quét nhanh EvoHome (`ro-hang.sh evohome`) | `radar-ro-hang@evohome` ← `radar-ro-hang-evohome.timer` | 09:00, 14:30, 19:30 | như trên |
| Bot Zalo nghe nhóm BĐS (`crawler/zalo-bot.mjs`) | `radar-zalo-bot` (chạy liên tục, tự bật lại) | 24/7 | `~/radar/logs/zalo-bot.log` |
| Đăng 1 phòng rổ hàng lên nhóm Zalo CHO THUÊ đúng khu vực (`crawler/zalo-dang-nhom.mjs`) | `radar-zalo-dang` ← `radar-zalo-dang.timer` | 15 phút/lần 08:30–19:45; mỗi nhóm ≤ 1 tin/ngày | `~/radar/logs/zalo-dang.log` |
| Ghi mức bận CPU/RAM | `radar-do-tai` ← `radar-do-tai.timer` | mỗi phút | `~/radar/logs/tai-<ngày>.csv` |

Máy này còn chạy **gatemonitor** (đếm xe camera), **openwa** (WhatsApp, có Chrome) và Tailscale Funnel `/` → `:8765`
cho webhook Imou. Không đụng vào các thứ đó.

## Nhường máy cho gatemonitor

- Mọi việc của Radar nằm trong `radar.slice`: `CPUWeight=10` (gatemonitor/openwa mặc định 100 → khi tranh CPU Radar chỉ
  được ~1/11), `MemoryMax=1800M`. `Nice` một mình không đủ: giữa các cgroup khác nhau chỉ có trọng số cgroup có tác dụng.
- Rổ hàng thêm `CPUQuota=70%`, `MemoryMax=1500M`, IO idle.
- `ro-hang.sh` chỉ diệt `ms-playwright/chromium`. Không dùng `pkill chromium` / `pkill chrome`: openwa cũng chạy Chrome.
- Xem mức bận theo giờ: `~/radar/tom-tat-tai.sh [YYYY-MM-DD]`. Gatemonitor tự nó đã trễ nhiều nhất trong 14–17h. Nếu
  crawler làm trễ thêm, dời lịch trong hai file timer.

## Cài / cài lại

```bash
git clone https://github.com/quang507/NhaDat-Radar.git ~/radar/NhaDat-Radar
# đặt ~/radar/NhaDat-Radar/.env.local (mục Bí mật), rồi:
bash ~/radar/NhaDat-Radar/deploy/nuc/cai-dat.sh
```

Mỗi lượt rổ hàng `git pull` code mới nhất. Bot Zalo chỉ đọc code lúc khởi động: sửa `zalo-bot.mjs` xong thì
`git pull` rồi `sudo systemctl restart radar-zalo-bot`. Sửa file trong thư mục này thì chạy lại `cai-dat.sh`.

## Bí mật (`~/radar/NhaDat-Radar/.env.local`, `chmod 600`, không bao giờ commit)

Chỉ ghi tên biến: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`NEXT_PUBLIC_SITE_URL`, `EVOHOME_PHONE`, `EVOHOME_PASSWORD`, `GEMINI_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`,
`ZALO_BO_QUA_NHOM` (mã các nhóm bot bỏ qua, cách nhau dấu phẩy).

Bộ nhớ đệm của crawler nằm ở `crawler/private/` (dấu vân tay phòng/toà, cache toạ độ). Mất thì lượt sau ghi lại toàn
bộ và quét đủ, không hỏng gì.

## Bot Zalo

- Dùng acc Zalo **clone** (không bao giờ dùng số hotline của web, `src/lib/hotline.ts`), đăng nhập bằng `zalo-agent-cli` 1.6.2 tại
  `~/.local/bin/zalo-agent`, phiên lưu ở `~/.zalo-agent-cli/`.
- Chỉ đọc tin trong nhóm, bỏ qua tin 1-1. Acc vào thêm nhóm BĐS thì bot tự đọc, không cần khởi động lại.
- Phiên hết hạn (log báo "Not logged in"): trên máy Windows bấm `ZALO-LOGIN.bat` ở thư mục gốc repo → mở QR qua
  Tailscale → quét bằng acc clone → bot tự bật lại. Xem nhanh tình trạng: `KIEM-TRA-ZALO.bat`.
- Không chạy bot ở hai máy cùng lúc với cùng một acc: Zalo sẽ đá một phiên.
- Đăng nhóm: nhóm nào cho thuê / mua bán, khu vực nào nằm ở `crawler/private/zalo-nhom.json` (không vào git). Acc vào
  nhóm mới thì chạy `node --env-file=.env.local crawler/zalo-dang-nhom.mjs nhom` (thêm nhóm dạng `chua_xep`), sửa
  `loai` + `khu_vuc`, rồi xem trước bằng `... zalo-dang-nhom.mjs --thu`. Gửi lỗi thì tự dừng 24 giờ + báo Telegram;
  muốn đăng lại sớm thì xoá `tamDungDen` trong `crawler/private/zalo-dang-trang-thai.json`. Hướng dẫn đủ: `crawler/ZALO-BOT.md`.

## Kiểm tra nhanh

```bash
systemctl list-timers 'radar-*'
systemctl status radar-zalo-bot
grep -E "BAT DAU|XONG" ~/radar/logs/ro-hang.log | tail
~/radar/tom-tat-tai.sh
```

## Tắt / quay lui

```bash
sudo systemctl disable --now radar-ro-hang-full.timer radar-ro-hang-evohome.timer radar-zalo-bot radar-zalo-dang.timer radar-do-tai.timer
```

VPS cũ còn giữ crontab rổ hàng dạng comment `#NUC#` (bản sao `/root/crontab.bak-20261028-nuc`) cho tới khi hết hạn.
