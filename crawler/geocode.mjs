// Geocode theo (quận/huyện + tỉnh) [ít request, cache], gán centroid + jitter cho từng tin.
// Ưu tiên Vietmap (VIETMAP_API_KEY), fallback Nominatim.
import fs from "node:fs";
import { smartGeocode } from "./geo.mjs";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const geocode = (q) => smartGeocode(q);

// jitter ổn định theo id để marker cùng quận không chồng khít
function jitter(id, base) {
  let h = 0;
  for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return base + ((h % 1000) / 1000 - 0.5) * 0.018; // ~±1km
}

async function run() {
  const db = JSON.parse(fs.readFileSync(new URL("./listings2.json", import.meta.url)));
  // scope 3 TP lớn (khớp crawler)
  const CITIES = /hà nội|hồ chí minh|hcm|sài gòn|đà nẵng/i;
  const items = db.listings.filter((x) => CITIES.test((x.province || "") + " " + (x.district || "")));

  const keys = [...new Set(items.map((x) => [x.district, x.province].filter(Boolean).join(", ")))].filter(Boolean);
  console.error("Geocode", keys.length, "khu vực (unique)...");
  const cache = {};
  for (const k of keys) {
    let g = await geocode(k + ", Việt Nam");
    if (!g) g = await geocode((k.split(",").pop() || "") + ", Việt Nam"); // fallback: tỉnh
    cache[k] = g;
    console.error("  ", k, "->", g ? `${g.lat.toFixed(4)},${g.lng.toFixed(4)}` : "MISS");
    await sleep(1100);
  }

  let hit = 0;
  const out = items.map((x) => {
    const k = [x.district, x.province].filter(Boolean).join(", ");
    const g = cache[k];
    if (g) {
      hit++;
      return { ...x, lat: jitter(x.id, g.lat), lng: jitter(x.id + "b", g.lng) };
    }
    return { ...x, lat: null, lng: null };
  });

  fs.writeFileSync(new URL("./listings3.json", import.meta.url), JSON.stringify({ summary: { ...db.summary, geocoded: hit, total: out.length }, listings: out }, null, 0));
  console.error(`\nĐã gán toạ độ ${hit}/${out.length} tin -> listings3.json`);
}
run();
