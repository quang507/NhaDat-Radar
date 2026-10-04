#!/usr/bin/env bash
export PATH=/usr/local/bin:/usr/bin:/bin:$PATH
export NODE_OPTIONS="--max-old-space-size=512"

cd /root/work/NhaDat-Radar

echo "==================================================="
echo "[$(date '+%Y-%m-%d %H:%M:%S')] QUET NHANH EVOHOME (90s)"
echo "==================================================="

git pull origin main || true
nice -n 10 node --env-file=.env.local crawler/evohome-fetch.mjs
pkill -f -9 chromium 2>/dev/null || true
nice -n 10 node --env-file=.env.local crawler/ro-hang-evohome.mjs
sync; echo 3 > /proc/sys/vm/drop_caches 2>/dev/null || true

echo "==================================================="
echo "[$(date '+%Y-%m-%d %H:%M:%S')] XONG EVOHOME"
echo "==================================================="
