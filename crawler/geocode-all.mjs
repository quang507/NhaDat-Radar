// Geocode BÙ cho MỌI tin thiếu toạ độ trong combined.json (theo quận+tỉnh).
// Ưu tiên Vietmap (VIETMAP_API_KEY), fallback Nominatim.
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { smartGeocode, usingVietmap } from "./geo.mjs";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// district trong combined.json đã chuẩn ("Quận 7", "Huyện Củ Chi", "TP. Thủ Đức" — merge.mjs canonDistrictName).
// Audit 16/8: bản cũ `^Q\.?\s*` bắt luôn chữ "Q" của "Quận 7" -> "Quận uận 7" -> mọi geocode hỏng, rơi về tâm tỉnh.
function cleanDistrict(d) {
  return (d || "").replace(/\(.*?\)/g, "").replace(/^TP\.\s*/i, "Thành phố ").replace(/\s+/g, " ").trim();
}
const geocode = (q) => smartGeocode(q); // Vietmap -> Nominatim (đều có timeout 8s)

// Ghim theo PHƯỜNG khi nguồn có phường, không thì mới lùi về QUẬN.
// Tâm quận cách chỗ thật có khi 5-7km (Củ Chi, Bình Chánh rộng cỡ đó), tâm phường sát hơn
// nhiều. 55% tin có phường mà trước giờ bỏ không dùng. Đo 19/8: khoá mức phường ra 398 khu
// vực (~1,5 phút) so với 193 khu vực mức quận (~42s) — vẫn thừa trong ngân sách 5 phút.
const khoaPhuong = (x) => x.ward ? [x.ward, cleanDistrict(x.district), x.province].filter(Boolean).join(", ") : null;
const khoaQuan = (x) => [cleanDistrict(x.district), x.province].filter(Boolean).join(", ");

// Rải điểm quanh tâm để tin cùng khu không chồng lên nhau. Ghim phường sát hơn ghim quận
// nên rải hẹp lại (~±170m thay vì ~±900m), không thì rải rộng lại phá mất độ chính xác vừa có.
function jitter(id, base, hep) {
  let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return base + ((h % 1000) / 1000 - 0.5) * (hep ? 0.003 : 0.016);
}

async function run() {
  const url = new URL("./combined.json", import.meta.url);
  const db = JSON.parse(fs.readFileSync(url));
  const need = db.listings.filter((x) => x.lat == null || x.lng == null);
  // phường trước, quận sau — quận vẫn cần vì (a) tin không có phường, (b) phường tra không ra
  const keys = [...new Set([...need.map(khoaPhuong), ...need.map(khoaQuan)].filter(Boolean))]
    .filter((k) => k.length > 3);
  console.error("Cần geocode", need.length, "tin,", keys.length, "khu vực unique... (nguồn:", usingVietmap ? "Vietmap" : "Nominatim", ")");
  // CACHE BỀN qua các lượt chạy: toạ độ một phường/quận không đổi, tra lại mỗi lượt là phí.
  // Trước đây cache chỉ sống trong 1 lần chạy nên lượt nào cũng tra lại ~590 khu vực rồi
  // đụng trần 5 phút (19/8: cắt ở 877/940 tin). Nay chỉ tra khu vực CHƯA từng biết.
  const FILE_CACHE = new URL("./geo-cache.json", import.meta.url);
  let cache = {};
  try { cache = JSON.parse(fs.readFileSync(FILE_CACHE, "utf8")); } catch { /* lần đầu */ }
  const daBiet = Object.keys(cache).length;
  const started = Date.now();
  const BUDGET_MS = 5 * 60 * 1000; // trần 5 phút cho toàn bộ geocode -> không bao giờ treo pipeline
  const canTra = keys.filter((k) => !(k in cache));
  console.error(`  cache đã có ${daBiet} khu vực -> chỉ tra thêm ${canTra.length}`);
  for (const k of canTra) {
    if (Date.now() - started > BUDGET_MS) {
      console.error("⚠ geocode: vượt ngân sách thời gian, bỏ qua các khu vực còn lại.");
      break;
    }
    let g = await geocode(k + ", Việt Nam");
    if (!g) g = await geocode((k.split(",").pop() || "") + ", Việt Nam");
    cache[k] = g;   // ghi cả null: khu vực tra không ra thì lượt sau khỏi tra lại
    // 1100ms là để tôn trọng giới hạn 1 request/giây của Nominatim. Vietmap không có
    // ràng buộc đó -> nhanh hơn 5 lần, nên trong cùng 5 phút bù được nhiều khu vực hơn hẳn.
    await sleep(usingVietmap ? 220 : 1100);
  }
  try { fs.writeFileSync(FILE_CACHE, JSON.stringify(cache, null, 0)); } catch { /* không quan trọng */ }

  let hit = 0;
  db.listings.forEach((x) => {
    if (x.lat != null && x.lng != null) return;
    const kp = khoaPhuong(x);
    const g = (kp && cache[kp]) || cache[khoaQuan(x)];
    const hep = !!(kp && cache[kp]);          // ghim được theo phường -> rải hẹp
    if (g) { x.lat = jitter(x.id, g.lat, hep); x.lng = jitter(x.id + "b", g.lng, hep); hit++; }
  });
  fs.writeFileSync(url, JSON.stringify(db, null, 0));
  console.error(`Đã bù toạ độ ${hit}/${need.length} tin. Tổng có toạ độ:`, db.listings.filter((x) => x.lat != null).length, "/", db.listings.length);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run();
