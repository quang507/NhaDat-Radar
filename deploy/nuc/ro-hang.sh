#!/usr/bin/env bash
# Rổ hàng EvoHome + HiFriendz trên NUC - thay cron-ro-hang.sh / cron-evohome.sh của VPS Vinahost (dời 28/10/2026).
#   full    = 4 bước như cron-ro-hang.sh (EvoHome rồi HiFriendz)
#   evohome = quét nhanh như cron-evohome.sh
# systemd gọi (radar-ro-hang@full / @evohome, xem timer cùng tên); unit đã hạ ưu tiên CPU để không giành máy với gatemonitor.
# Log: ~/radar/logs/ro-hang.log
set -u
MODE="${1:-full}"
export NODE_OPTIONS="--max-old-space-size=512"
cd "$HOME/radar/NhaDat-Radar" || exit 1

# Hai lượt không chạy chồng nhau (lượt full trên máy yếu có thể kéo dài)
exec 9>"$HOME/radar/ro-hang.lock"
flock -w 3600 9 || { echo "[$(date '+%F %T')] lượt trước chưa xong sau 1 giờ, bỏ lượt $MODE"; exit 1; }

# Chỉ diệt Chromium của Playwright: openwa (WhatsApp của gatemonitor) cũng chạy Chrome trên máy này
don_chromium() { pkill -9 -f ms-playwright/chromium 2>/dev/null || true; }

rc=0
echo "==================================================="
echo "[$(date '+%F %T')] BAT DAU RO HANG ($MODE) - NUC"
git pull -q --ff-only origin main || echo "git pull lỗi, chạy bản đang có"

echo "[EvoHome] cào"
node --env-file=.env.local crawler/evohome-fetch.mjs || rc=1
don_chromium
echo "[EvoHome] đồng bộ lên web"
node --env-file=.env.local crawler/ro-hang-evohome.mjs || rc=1

if [ "$MODE" = full ]; then
  echo "[HiFriendz] cào"
  node crawler/hifriendz-fetch.mjs || rc=1
  echo "[HiFriendz] đồng bộ lên web"
  RO_HANG_PARTNER=hifriendz node --env-file=.env.local crawler/ro-hang-evohome.mjs || rc=1
fi

echo "[$(date '+%F %T')] XONG RO HANG ($MODE) rc=$rc"
exit $rc
