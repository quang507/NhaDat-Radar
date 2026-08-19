// Geocode BÙ cho MỌI tin thiếu toạ độ trong combined.json (theo quận+tỉnh).
// Ưu tiên Vietmap (VIETMAP_API_KEY), fallback Nominatim.
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { smartGeocode, usingVietmap, LOI } from "./geo.mjs";
import { docDuong } from "./doc-dia-chi.mjs";
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

// Nấc CHÍNH XÁC NHẤT: tên đường. Lấy từ trường address của nguồn (guland có sẵn), không có
// thì đọc từ nội dung bài (docDuong). CHỈ dùng để geocode, KHÔNG hiển thị và KHÔNG ghi vào
// cột address: bộ đọc chỉ đúng ~1/3 và còn lẫn rác ("738 Linh Lược Nhà Ẩn"). Đọc sai thì
// geo.mjs bắt kết quả phải khớp tên -> tra không thấy -> tự lùi xuống phường/quận, chứ
// không bao giờ ghim bậy. Nên nấc này chỉ có được thêm, không mất gì.
const khoaDuong = (x) => {
  if (!x.district) return null;                 // không có quận thì địa chỉ cũng vô nghĩa
  const duong = x.address || docDuong(x.description || x.title || "");
  return duong ? [duong, x.ward, cleanDistrict(x.district), x.province].filter(Boolean).join(", ") : null;
};

// Rải điểm quanh tâm để tin cùng khu không chồng lên nhau. Ghim phường sát hơn ghim quận
// nên rải hẹp lại (~±170m thay vì ~±900m), không thì rải rộng lại phá mất độ chính xác vừa có.
function jitter(id, base, hep) {
  let h = 0; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return base + ((h % 1000) / 1000 - 0.5) * (hep ? 0.003 : 0.016);
}

async function run() {
  const url = new URL("./combined.json", import.meta.url);
  const db = JSON.parse(fs.readFileSync(url));
  // Không có quận thì bỏ hẳn, không ghim: ghim theo tâm TỈNH đặt tin giữa đồng cách chỗ
  // thật hàng chục km — sai kiểu đó tệ hơn là không có ghim.
  const need = db.listings.filter((x) => (x.lat == null || x.lng == null) && x.district);
  const boQua = db.listings.filter((x) => (x.lat == null || x.lng == null) && !x.district).length;
  // phường trước, quận sau — quận vẫn cần vì (a) tin không có phường, (b) phường tra không ra
  // Thứ tự TRA: QUẬN -> PHƯỜNG -> ĐƯỜNG. Ngược với thứ tự ƯU TIÊN khi ghim (đường sát nhất).
  // Lý do: khoá quận ít mà phủ mọi tin, khoá đường nhiều gấp mấy lần và mỗi khoá tốn nhiều
  // lượt gọi hơn (thử Vietmap -> Nominatim -> tên tỉnh cũ). Tra đường trước thì hết ngân
  // sách trước khi kịp tra quận -> đo 19/8: chỉ ghim được 63/914 tin, tệ hơn hẳn 877/914.
  // Phủ rộng trước, tinh sau: hết giờ thì mọi tin vẫn có ghim, chỉ là chưa sát nhất.
  const keys = [...new Set([...need.map(khoaQuan), ...need.map(khoaPhuong), ...need.map(khoaDuong)].filter(Boolean))]
    .filter((k) => k.length > 3);
  if (boQua) console.error(`  bỏ qua ${boQua} tin không có quận (không ghim còn hơn ghim sai giữa tỉnh)`);
  console.error("Cần geocode", need.length, "tin,", keys.length, "khu vực unique... (nguồn:", usingVietmap ? "Vietmap" : "Nominatim", ")");
  // CACHE BỀN qua các lượt chạy: toạ độ một phường/quận không đổi, tra lại mỗi lượt là phí.
  // Trước đây cache chỉ sống trong 1 lần chạy nên lượt nào cũng tra lại ~590 khu vực rồi
  // đụng trần 5 phút (19/8: cắt ở 877/940 tin). Nay chỉ tra khu vực CHƯA từng biết.
  const FILE_CACHE = new URL("./geo-cache.json", import.meta.url);
  let cache = {};
  try { cache = JSON.parse(fs.readFileSync(FILE_CACHE, "utf8")); } catch { /* lần đầu */ }
  const daBiet = Object.keys(cache).length;
  const started = Date.now();
  // Trần thời gian -> không bao giờ treo pipeline. Nới 5 -> 8 phút vì nay có thêm nấc đường,
// và CI đã nới timeout lên 60 phút. Cache bền nên lượt sau gần như không tốn gì.
const BUDGET_MS = Number(process.env.GEOCODE_BUDGET_MS || 8 * 60 * 1000);
  let hong = 0;
  const canTra = keys.filter((k) => !(k in cache));
  console.error(`  cache đã có ${daBiet} khu vực -> chỉ tra thêm ${canTra.length}`);
  for (const k of canTra) {
    if (Date.now() - started > BUDGET_MS) {
      console.error("⚠ geocode: vượt ngân sách thời gian, bỏ qua các khu vực còn lại.");
      break;
    }
    let g = await geocode(k + ", Việt Nam");
    if (g !== LOI && !g) g = await geocode((k.split(",").pop() || "") + ", Việt Nam");
    // CHỈ cache kết quả thật và "tra xong không có". Hỏi hỏng (429 / timeout) thì bỏ qua,
    // để lượt sau tra lại — cache null vì bị chặn tần suất là đầu độc cache vĩnh viễn.
    if (g === LOI) { hong++; await sleep(2000); continue; }
    cache[k] = g;
    // 1100ms là để tôn trọng giới hạn 1 request/giây của Nominatim. Vietmap không có
    // ràng buộc đó -> nhanh hơn 5 lần, nên trong cùng 5 phút bù được nhiều khu vực hơn hẳn.
    await sleep(usingVietmap ? 220 : 1100);
  }
  try { fs.writeFileSync(FILE_CACHE, JSON.stringify(cache, null, 0)); } catch { /* không quan trọng */ }

  let hit = 0;
  const muc = {};
  db.listings.forEach((x) => {
    if (x.lat != null && x.lng != null) return;
    if (!x.district) return;
    const kd = khoaDuong(x), kp = khoaPhuong(x);
    const gd = kd && cache[kd], gp = kp && cache[kp];
    const g = gd || gp || cache[khoaQuan(x)];
    if (!g) return;
    // ghim theo đường thì để NGUYÊN toạ độ (đã đúng chỗ, rải ra là phá);
    // theo phường rải hẹp ~±170m; theo quận rải rộng ~±900m cho tin khỏi chồng nhau
    if (gd) { x.lat = g.lat; x.lng = g.lng; }
    else { x.lat = jitter(x.id, g.lat, !!gp); x.lng = jitter(x.id + "b", g.lng, !!gp); }
    hit++;
    muc[gd ? "đường" : gp ? "phường" : "quận"] = (muc[gd ? "đường" : gp ? "phường" : "quận"] || 0) + 1;
  });
  fs.writeFileSync(url, JSON.stringify(db, null, 0));
  if (hong) console.error(`  ⚠ ${hong} khu vực hỏi hỏng (429/timeout) -> KHÔNG cache, lượt sau tra lại`);
  console.error("  ghim theo:", JSON.stringify(muc));
  console.error(`Đã bù toạ độ ${hit}/${need.length} tin. Tổng có toạ độ:`, db.listings.filter((x) => x.lat != null).length, "/", db.listings.length);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) run();
