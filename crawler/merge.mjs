// Gộp đa nguồn -> 1 dataset chuẩn (nhadat + chotot + batdongsan). Chuẩn hoá tên tỉnh + url + price_per_m2.
import fs from "node:fs";
import { isJunk } from "./junk.mjs";
const load = (f) => { try { return JSON.parse(fs.readFileSync(new URL("./" + f, import.meta.url))).listings || []; } catch { return []; } };

function canonProvince(p) {
  const t = (p || "").toLowerCase();
  if (/hà nội|ha noi/.test(t)) return "Hà Nội";
  if (/hồ chí minh|ho chi minh|hcm|sài gòn/.test(t)) return "Hồ Chí Minh";
  if (/đà nẵng|da nang/.test(t)) return "Đà Nẵng";
  return p || null;
}
// Điểm heuristic khi nguồn không tự chấm (batdongsan/mogi): có phổ 45-95 theo độ đầy đủ
// dữ liệu thay vì 75 phẳng hàng loạt.
function heuristicScore(x) {
  let s = 55;
  if (x.price_vnd) s += 8;
  if (x.area_m2) s += 7;
  if (x.bedrooms) s += 4;
  if (x.bathrooms) s += 3;
  if ((x.images || []).length >= 3) s += 8;
  else if ((x.images || []).length >= 1) s += 4;
  if ((x.description || "").length > 200) s += 5;
  if (x.district) s += 3;
  if (x.price_warning) s -= 18;
  return Math.max(45, Math.min(95, s));
}

function norm(x) {
  const price = x.price_vnd ?? null, area = x.area_m2 ?? null;
  return {
    id: x.id,
    source: x.source || "crawl",
    source_site: x.source_site || "nhadat.vn",
    url: x.url || x.source_url || "#",
    source_post_id: x.source_post_id || x.id,
    title: x.title || "",
    description: x.description || "",
    price_vnd: price, area_m2: area,
    price_per_m2: x.price_per_m2 ?? (price && area ? Math.round(price / area) : null),
    bedrooms: x.bedrooms ?? null, bathrooms: x.bathrooms ?? null, floors: x.floors ?? null,
    direction: x.direction ?? null, legal: x.legal ?? x.legal_status ?? null, furnishing: x.furnishing ?? null,
    listing_type: x.listing_type, property_type: x.property_type,
    province: canonProvince(x.province), district: x.district ?? null, ward: x.ward ?? null,
    lat: x.lat ?? null, lng: x.lng ?? null,
    amenities: x.amenities || [],
    poster_role: x.poster_role || "khong_ro", poster_listing_count: x.poster_listing_count || 1,
    phone_masked: x.phone_masked ?? null, phone_hash: x.phone_hash ?? null,
    ai_score: x.ai_score ?? heuristicScore(x),
    price_warning: x.price_warning ?? null,
    freshness_min: x.freshness_min ?? 60,
    // làm sạch ảnh: bỏ object rác + link album facebook (không phải file ảnh)
    images: (x.images || [])
      .map((i) => (typeof i === "string" ? i : i && i.uri))
      .filter((u) => typeof u === "string" && /^https?:\/\//.test(u) && !u.includes("facebook.com/media")),
  };
}

const sources = [["listings3.json", 0], ["chotot.json", 0], ["batdongsan.json", 0], ["mogi.json", 0], ["facebook.json", 0], ["extra.json", 0]];
let all = [];
for (const [f] of sources) { const rows = load(f).map(norm); all = all.concat(rows); console.error(f, "->", rows.length); }

// Lọc tin rác (dịch vụ, tuyển dụng, vay vốn, hàng tiêu dùng...) trước khi dedupe
const beforeJunk = all.length;
all = all.filter((x) => !isJunk(x.title, x.description));
console.error("junk filter:", beforeJunk, "->", all.length, `(bỏ ${beforeJunk - all.length} tin rác)`);

// khử trùng trong-nguồn theo id + cross-source theo dedupe_key (phone/giá/diện tích/quận)
// + fallback (site|title|giá) cho tin thiếu phone_hash (nhadat từng lọt trùng vì thiếu key này)
const seenId = new Set(), seenKey = new Set(), seenTitle = new Set();
all = all.filter((x) => {
  if (seenId.has(x.id)) return false; seenId.add(x.id);
  if (x.phone_hash && x.price_vnd && x.area_m2) {
    const k = [x.phone_hash, Math.round(x.price_vnd / 1e6), Math.round(x.area_m2), x.district].join("|");
    if (seenKey.has(k)) return false; seenKey.add(k);
  }
  const tk = [x.source_site, (x.title || "").toLowerCase().trim(), x.price_vnd ?? 0].join("|");
  if (x.title && seenTitle.has(tk)) return false; seenTitle.add(tk);
  return true;
});

const summary = {
  crawled_at: new Date().toISOString().slice(0, 10), total: all.length,
  by_source: all.reduce((a, x) => ((a[x.source_site] = (a[x.source_site] || 0) + 1), a), {}),
  by_city: all.reduce((a, x) => ((a[x.province] = (a[x.province] || 0) + 1), a), {}),
  with_geo: all.filter((x) => x.lat).length, with_ward: all.filter((x) => x.ward).length,
  ban: all.filter((x) => x.listing_type === "ban").length, cho_thue: all.filter((x) => x.listing_type === "cho_thue").length,
};
fs.writeFileSync(new URL("./combined.json", import.meta.url), JSON.stringify({ summary, listings: all }, null, 0));
console.error("MERGED", JSON.stringify(summary));
