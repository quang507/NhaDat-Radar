#!/bin/sh
# Render lần lượt mọi video (promo, 3 bước, các tin đã lấy). Chạy: sh scripts/render-tat-ca.sh
cd "$(dirname "$0")/.."
CH="--browser-executable=C:/Program Files/Google/Chrome/Application/chrome.exe"
r() { echo "== $2"; npx remotion render src/index.ts "$1" "$2" $3 --codec h264 --crf 18 --overwrite "$CH" 2>&1 | grep -E "Encoded|rror" | tail -2; }
r RadarPromo out/radar-promo.mp4
r BaBuoc out/ba-buoc.mp4
for p in public/tin/*/props.json; do
  ma=$(node -e "console.log(require('./$p').ma)")
  r TinPhong "out/tin-$ma.mp4" "--props=$p"
done
echo XONG
