#!/usr/bin/env bash
# Cài / cài lại việc nền Nhadatradar trên NUC (Ubuntu 22.04, user quang, sudo không mật khẩu).
# Chạy lại bao nhiêu lần cũng được. Không đụng gatemonitor / openwa / Tailscale Funnel.
#
#   git clone https://github.com/quang507/NhaDat-Radar.git ~/radar/NhaDat-Radar
#   bash ~/radar/NhaDat-Radar/deploy/nuc/cai-dat.sh
#
# Bí mật KHÔNG nằm trong repo: tự đặt ~/radar/NhaDat-Radar/.env.local (xem README.md cùng thư mục).
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
REPO="$HOME/radar/NhaDat-Radar"
[ "$(id -un)" = quang ] || { echo "Chạy bằng user quang (unit systemd ghi cứng /home/quang)"; exit 1; }
[ -d "$REPO/.git" ] || { echo "Chưa có $REPO - git clone trước"; exit 1; }

mkdir -p "$HOME/radar/logs"
install -m 755 "$DIR/ro-hang.sh" "$DIR/do-tai.sh" "$DIR/tom-tat-tai.sh" "$HOME/radar/"

echo "== thư viện + Chromium cho crawler"
(cd "$REPO" && nice -n 15 npm ci --no-audit --no-fund --loglevel=error && nice -n 15 npx playwright install chromium)
command -v "$HOME/.local/bin/zalo-agent" >/dev/null || nice -n 10 npm i -g --prefix "$HOME/.local" zalo-agent-cli@1.6.2 --no-audit --no-fund --loglevel=error

echo "== systemd + logrotate"
sudo install -m 644 "$DIR"/radar.slice "$DIR"/radar-ro-hang@.service "$DIR"/radar-ro-hang-full.timer \
  "$DIR"/radar-ro-hang-evohome.timer "$DIR"/radar-zalo-bot.service "$DIR"/radar-do-tai.service \
  "$DIR"/radar-do-tai.timer "$DIR"/radar-zalo-dang.service "$DIR"/radar-zalo-dang.timer /etc/systemd/system/
sudo install -m 644 "$DIR/radar.logrotate" /etc/logrotate.d/radar-ro-hang
sudo systemctl daemon-reload
sudo systemctl enable --now radar-ro-hang-full.timer radar-ro-hang-evohome.timer radar-do-tai.timer

if [ -f "$REPO/.env.local" ] && "$HOME/.local/bin/zalo-agent" status 2>/dev/null | grep -q "Logged in"; then
  sudo systemctl enable radar-zalo-bot && sudo systemctl restart radar-zalo-bot
  sudo systemctl enable --now radar-zalo-dang.timer   # không có crawler/private/zalo-nhom.json thì lượt đăng tự bỏ qua
  echo "== bot Zalo: $(systemctl is-active radar-zalo-bot)"
else
  echo "== bot Zalo CHƯA bật: thiếu .env.local hoặc chưa đăng nhập Zalo (README.md mục Bot Zalo)"
fi
[ -f "$REPO/.env.local" ] || echo "!! Thiếu $REPO/.env.local - rổ hàng sẽ lỗi tới khi có file này"
systemctl list-timers 'radar-*' --no-pager
