// Chạy lúc pm2 dậy (bật máy): nếu lần cào gần nhất đã quá STALE_H giờ (mặc định 7h) thì chạy daily.mjs ngay.
// Giải quyết: máy tắt lúc 9h/15h -> cron daily-crawl không chạy -> FB/Zalo-máy-nhà mất lượt đó.
// Ngưỡng 7h khớp lịch 2 lần/ngày (9h & 15h cách nhau 6h): vừa bắt được lượt bị lỡ,
// vừa không cào lại vô ích khi mới chạy cách đây vài tiếng.
// Mốc lần cào = file crawler/.last-run (daily.mjs ghi khi seed xong; gitignore).
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const here = import.meta.dirname;
const marker = path.join(here, ".last-run");
const STALE_H = Number(process.env.CRAWL_STALE_HOURS || 7);
let last = 0;
try { last = Number(fs.readFileSync(marker, "utf8").trim()) || 0; } catch { /* chưa từng chạy */ }
const ageH = (Date.now() - last) / 36e5;
if (last && ageH < STALE_H) {
  console.log(`crawl-on-boot: lần cào gần nhất ${ageH.toFixed(1)}h trước (< ${STALE_H}h) -> bỏ qua, chờ cron 9h/15h.`);
  process.exit(0);
}
console.log(`crawl-on-boot: ${last ? `đã ${ageH.toFixed(1)}h` : "chưa có mốc"} -> chạy daily.mjs ngay.`);
try {
  execFileSync(process.execPath, ["--env-file=.env.local", "crawler/daily.mjs"], { stdio: "inherit", cwd: path.join(here, ".."), windowsHide: true });
} catch (e) {
  console.error("crawl-on-boot: daily.mjs lỗi:", e.message);
  process.exit(1);
}
