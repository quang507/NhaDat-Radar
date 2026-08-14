// Geocode BÙ cho MỌI tin thiếu toạ độ trong combined.json (theo quận+tỉnh, Nominatim free).
import fs from "node:fs";
import { pathToFileURL } from "node:url";
const UA = "NhaDatRadar/1.0 (proptech)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function cleanDistrict(d) {
  return (d || "").replace(/\(.*?\)/g, "").replace(/^Q\.?\s*/i, "Quận ").replace(/^H\.?\s*/i, "Huyện ")
    .replace(/^TP\.?\s*/i, "Thành phố ").replace(/\s+/g, " ").trim();
}
async function geocode(q) {
  // Timeout 8s/request — Nominatim hay chặn IP CI & giữ kết nối treo -> nếu không có timeout, fetch treo vô hạn.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=vn&q=${encodeURIComponent(q)}`,
      { headers: { "User-Agent": UA, "Accept-Language": "vi" }, signal: ctrl.signal });
    if (!res.ok) return null;
    const j = await res.json();
    return j.length ? { lat: +j[0].lat, lng: +j[0].lon } : null;
  } catch { return null; }
  finally { clearTimeout(timer); }
}
function jitter(id, base) { let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return base + ((h % 1000) / 1000 - 0.5) * 0.016; }

async function run() {
  const url = new URL("./combined.json", import.meta.url);
  const db = JSON.parse(fs.readFileSync(url));
  const need = db.listings.filter((x) => x.lat == null || x.lng == null);
  const keys = [...new Set(need.map((x) => [cleanDistrict(x.district), x.province].filter(Boolean).join(", ")))].filter((k) => k.length > 3);
  console.error("Cần geocode", need.length, "tin,", keys.length, "khu vực unique...");
  const cache = {};
  const started = Date.now();
  const BUDGET_MS = 5 * 60 * 1000; // trần 5 phút cho toàn bộ geocode -> không bao giờ treo pipeline
  for (const k of keys) {
    if (Date.now() - started > BUDGET_MS) {
      console.error("⚠ geocode: vượt ngân sách thời gian, bỏ qua các khu vực còn lại.");
      break;
    }
    let g = await geocode(k + ", Việt Nam");
    if (!g) g = await geocode((k.split(",").pop() || "") + ", Việt Nam");
    cache[k] = g;
    await sleep(1100);
  }
  let hit = 0;
  db.listings.forEach((x) => {
    if (x.lat != null && x.lng != null) return;
    const k = [cleanDistrict(x.district), x.province].filter(Boolean).join(", ");
    const g = cache[k];
    if (g) { x.lat = jitter(x.id, g.lat); x.lng = jitter(x.id + "b", g.lng); hit++; }
  });
  fs.writeFileSync(url, JSON.stringify(db, null, 0));
  console.error(`Đã bù toạ độ ${hit}/${need.length} tin. Tổng có toạ độ:`, db.listings.filter((x) => x.lat != null).length, "/", db.listings.length);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run();
