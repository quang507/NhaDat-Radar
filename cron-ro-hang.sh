#!/usr/bin/env bash
export PATH=/usr/local/bin:/usr/bin:/bin:$PATH
# Giới hạn bộ nhớ V8 của Node tối đa 512MB để an toàn tuyệt đối trên VPS 1GB RAM
export NODE_OPTIONS="--max-old-space-size=512"

cd /root/work/NhaDat-Radar

echo "==================================================="
echo "[$(date '+%Y-%m-%d %H:%M:%S')] BAT DAU CAP NHAT RO HANG (VPS SAFE MODE)"
echo "==================================================="

# 1. Kéo code mới nhất từ git
git pull origin main || true

# 2. Cào EvoHome (chạy với độ ưu tiên CPU thấp nice -n 10 để không bao giờ treo hệ thống)
echo "[1/4] Cao EvoHome..."
nice -n 10 node --env-file=.env.local crawler/evohome-fetch.mjs

# Dọn dẹp tiến trình Chromium thừa ngay lập tức
pkill -f -9 chromium 2>/dev/null || true
sync

# 3. Đồng bộ EvoHome lên web
echo "[2/4] Dong bo EvoHome len web (tu dong ha phong da thue)..."
nice -n 10 node --env-file=.env.local crawler/ro-hang-evohome.mjs

# Giải phóng bộ nhớ đệm trước khi chạy bước HiFriendz
sync; echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || true
sleep 3

# 4. Cào HiFriendz
echo "[3/4] Cao HiFriendz..."
nice -n 10 node crawler/hifriendz-fetch.mjs

# 5. Đồng bộ HiFriendz lên web
echo "[4/4] Dong bo HiFriendz len web (tu dong ha phong da thue)..."
RO_HANG_PARTNER=hifriendz nice -n 10 node --env-file=.env.local crawler/ro-hang-evohome.mjs

# Thu dọn cache cuối ca
sync; echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || true

echo "==================================================="
echo "[$(date '+%Y-%m-%d %H:%M:%S')] HOAN TAT CAP NHAT RO HANG"
echo "==================================================="
