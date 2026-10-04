#!/usr/bin/env bash
export PATH=/usr/local/bin:/usr/bin:/bin:$PATH
cd /root/work/NhaDat-Radar

echo "==================================================="
echo "[$(date '+%Y-%m-%d %H:%M:%S')] BAT DAU CAP NHAT RO HANG"
echo "==================================================="

# 1. Kéo code mới nhất từ git
git pull origin main || true

# 2. Cào EvoHome
echo "[1/4] Cao EvoHome..."
node --env-file=.env.local crawler/evohome-fetch.mjs

# 3. Đồng bộ EvoHome lên web
echo "[2/4] Dong bo EvoHome len web (tu dong ha phong da thue)..."
node --env-file=.env.local crawler/ro-hang-evohome.mjs

# 4. Cào HiFriendz
echo "[3/4] Cao HiFriendz..."
node crawler/hifriendz-fetch.mjs

# 5. Đồng bộ HiFriendz lên web
echo "[4/4] Dong bo HiFriendz len web (tu dong ha phong da thue)..."
RO_HANG_PARTNER=hifriendz node --env-file=.env.local crawler/ro-hang-evohome.mjs

echo "==================================================="
echo "[$(date '+%Y-%m-%d %H:%M:%S')] HOAN TAT CAP NHAT RO HANG"
echo "==================================================="
