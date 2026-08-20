// Gộp đa nguồn -> 1 dataset chuẩn (nhadat + chotot + batdongsan). Chuẩn hoá tên tỉnh + url + price_per_m2.
import fs from "node:fs";
import { isJunk } from "./junk.mjs";
import { canonProvince } from "./chung.mjs";
import { PHONE_RE } from "./quality-gate.mjs";
import { createHash } from "node:crypto";

// SĐT tin cào: NĐ13 -> KHÔNG lưu số thô vào DB (daily.mjs vẫn ép contact_phone = null).
// Nhưng thiết kế cũ có sẵn phone_masked để hiển thị, mà chưa nguồn nào tạo ra -> 0/4255 tin,
// khách chỉ thấy "SĐT ẩn". Chuyển ở ĐÂY, một chỗ duy nhất cho mọi nguồn, nên số thô không
// bao giờ chảy tiếp xuống seed.
//   che: 0903994567 -> 090399***   (giống cách chotot hiện công khai: "Hiện số 090399 ***")
//   hash: để gộp "N tin khác của cùng người đăng" mà không cần giữ số
function cheSdt(raw) {
  const d = String(raw || "").replace(/\D/g, "").replace(/^84/, "0");
  if (d.length < 9 || d.length > 11) return { masked: null, hash: null };
  return { masked: d.slice(0, 6) + "***", hash: createHash("sha256").update(d).digest("hex").slice(0, 16) };
}
// File nguồn quá cũ (crawler bị chặn/không chạy nên không ghi đè) -> BỎ QUA, không "thấy lại" tin cũ
// (last_seen_at phải trung thực: chỉ tin cào được hôm nay mới tính là còn sống). File không có crawled_at -> vẫn nhận.
const STALE_DAYS = Number(process.env.SOURCE_STALE_DAYS || 2);
const load = (f) => {
  try {
    const j = JSON.parse(fs.readFileSync(new URL("./" + f, import.meta.url)));
    const at = j.summary && j.summary.crawled_at;
    if (at && (Date.now() - new Date(at).getTime()) / 864e5 > STALE_DAYS) { console.error(f, "-> BỎ QUA (cào lần cuối", at, "- quá", STALE_DAYS, "ngày)"); return []; }
    // File THIẾU crawled_at thì cổng chống-file-cũ ở trên không có gì để so -> mọi tin trong đó
    // được nhận vô thời hạn, last_seen_at luôn tươi, và tin đã chết KHÔNG BAO GIỜ chuyển 'gone'.
    // Đã xảy ra thật: nhánh `--test` của batdongsan.mjs ghi summary không kèm crawled_at
    // (review /ultrareview - nay đã sửa). Kêu to để lần sau còn biết đường lần.
    if (!at) console.error(f, "-> ⚠ THIẾU crawled_at: không kiểm được tuổi file, tin cũ có thể sống mãi.");
    return j.listings || [];
  } catch { return []; }
};

// canonProvince dung chung (chung.mjs) - ban cu o day THIEU "tphcm" so voi ban mogi:
// cung mot tinh chuan hoa khac nhau tuy nguon, bo loc tinh tren web bi tach doi
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

// "Quận 9 (P. Long Bình mới)" -> district "Quận 9", phần ngoặc bù vào ward nếu trống
// Chuẩn hoá tiền tố quận/huyện về 1 dạng (audit 16/8: batdongsan "Q. Bình Thạnh / H. Hóc Môn / TP. Thủ Đức",
// chotot/mogi "Quận Bình Thạnh / Huyện Hóc Môn / Thành phố Thủ Đức / Quận Thủ Đức" -> cùng quận bị chẻ 2-3 bucket
// -> bộ lọc, trang khu vực, cụm so sánh giá đều sai). Chuẩn: "Quận X" · "Huyện X" · "TP. X" · "Thị xã X".
function canonDistrictName(d) {
  let s = d.replace(/\s+/g, " ").trim();
  s = s.replace(/^(q\.\s*|q\s+)/i, "Quận ").replace(/^quận\s+/i, "Quận ")     // "Q. Bình Thạnh", "Q.1", "Q 7"
       .replace(/^(h\.\s*|h\s+)/i, "Huyện ").replace(/^huyện\s+/i, "Huyện ")   // "H. Hóc Môn", "H.Nhà Bè"
       .replace(/^(tp\.?|thành phố|thanh pho)\s+/i, "TP. ")
       .replace(/^(tx\.?|thị xã|thi xa)\s+/i, "Thị xã ");
  if (/^Quận Thủ Đức$/i.test(s)) s = "TP. Thủ Đức";           // Thủ Đức đã lên TP (2021)
  s = s.replace(/^Quận\s+0?(\d{1,2})$/, "Quận $1");             // "Quận 07" -> "Quận 7"
  return s;
}
function canonDistrict(raw) {
  const s = (raw || "").trim();
  if (!s) return { district: null, wardHint: null };
  const m = s.match(/\(\s*(?:P\.|Phường)?\s*([^)]*?)\s*(?:mới)?\s*\)\s*$/i);
  const base = s.replace(/\s*\([^)]*\)\s*$/, "").trim();
  const district = base ? canonDistrictName(base) : null;
  const wardHint = m && m[1] ? "Phường " + m[1].replace(/^(P\.|Phường)\s*/i, "") : null;
  return { district, wardHint };
}

function norm(x) {
  const price = x.price_vnd ?? null, area = x.area_m2 ?? null;
  const dc = canonDistrict(x.district);
  // nguồn nào không có sẵn trường SĐT thì dò trong mô tả - chotot/mogi người đăng hay tự
  // viết số vào bài (đo: 98% tin facebook dò ra được số ngay trong mô tả).
  const sdt = x.phone_masked ? { masked: x.phone_masked, hash: x.phone_hash ?? null }
    : cheSdt(x.contact_phone || (x.description || "").match(PHONE_RE)?.[0]);
  return {
    id: x.id,
    source: x.source || "crawl",
    source_site: x.source_site || "nhadat.vn",
    // null chu khong phai "#" - review 19/8: "#" la chuoi khac rong nen lot moi kiem tra
    // truthy, tung lam nut "Xem bai goc" hien ra ma bam dung yen (319/808 tin facebook).
    // Day la diem hep duy nhat moi nguon di qua -> chan o day, ha nguon khoi phai nho.
    url: x.url || x.source_url || null,
    source_post_id: x.source_post_id || x.id,
    title: x.title || "",
    description: x.description || "",
    price_vnd: price, area_m2: area,
    price_per_m2: x.price_per_m2 ?? (price && area ? Math.round(price / area) : null),
    bedrooms: x.bedrooms ?? null, bathrooms: x.bathrooms ?? null, floors: x.floors ?? null,
    direction: x.direction ?? null, legal: x.legal ?? x.legal_status ?? null, furnishing: x.furnishing ?? null,
    listing_type: x.listing_type, property_type: x.property_type,
    province: canonProvince(x.province), district: dc.district, ward: x.ward ?? dc.wardHint ?? null,
    address: x.address ?? null,                      // chuỗi địa chỉ nguyên văn của nguồn (có tên đường)
    lat: x.lat ?? null, lng: x.lng ?? null,
    amenities: x.amenities || [],
    specs: x.specs && Object.keys(x.specs).length ? x.specs : null,   // bảng thông số riêng của nguồn
    poster_role: x.poster_role || "khong_ro", poster_listing_count: x.poster_listing_count || 1,
    poster_id: x.poster_id ?? null,
    poster_reasons: Array.isArray(x.poster_reasons) ? x.poster_reasons : [],
    phone_masked: x.phone_masked ?? sdt.masked, phone_hash: x.phone_hash ?? sdt.hash,
    posted_at: x.posted_at ?? null,          // thời điểm đăng trên nguồn (nếu nguồn có)
    ai_score: x.ai_score ?? heuristicScore(x),
    price_warning: x.price_warning ?? null,  // tính lại bên dưới trên toàn bộ dữ liệu (không còn phụ thuộc 1 nguồn)
    source_count: 1,                         // số nguồn cùng đăng tin này (dedupe liên nguồn cộng dồn)
    // làm sạch ảnh: bỏ object rác + link album facebook (không phải file ảnh)
    images: (x.images || [])
      .map((i) => (typeof i === "string" ? i : i && i.uri))
      .filter((u) => typeof u === "string" && /^https?:\/\//.test(u) && !u.includes("facebook.com/media")),
  };
}

// (listings3.json = nhadat.vn đã bỏ 16/8 - domain chết)
const sources = ["chotot.json", "batdongsan.json", "mogi.json", "facebook.json", "extra.json", "guland.json"];
let all = [];
for (const f of sources) { const rows = load(f).map(norm); all = all.concat(rows); console.error(f, "->", rows.length); }

// Lọc tin rác (dịch vụ, tuyển dụng, vay vốn, hàng tiêu dùng...) trước khi dedupe
const beforeJunk = all.length;
all = all.filter((x) => !isJunk(x.title, x.description));
console.error("junk filter:", beforeJunk, "->", all.length, `(bỏ ${beforeJunk - all.length} tin rác)`);

// Cổng chất lượng (audit 16/8: batdongsantoanquoc 141/144 tin không giá, không DT, không quận -> lọt search dạng
// "Thoả thuận · -", không lọc/so sánh được gì): tin phải có (giá HOẶC diện tích) VÀ (quận HOẶC tỉnh). Log theo nguồn.
const beforeGate = all.length, dropped = {};
all = all.filter((x) => {
  const ok = (x.price_vnd || x.area_m2) && (x.district || x.province);
  if (!ok) dropped[x.source_site] = (dropped[x.source_site] || 0) + 1;
  return ok;
});
if (beforeGate !== all.length) console.error("cổng chất lượng:", beforeGate, "->", all.length, "(bỏ vì thiếu giá+DT hoặc thiếu khu vực:", JSON.stringify(dropped) + ")");

// Tiêu đề quá ngắn ("Chính chủ bán", "phòng sạch đẹp") -> card vô nghĩa: nối thêm loại + khu vực để người xem hiểu
const KIND_VI = { nha: "Nhà", dat: "Đất", can_ho: "Căn hộ", mat_bang: "Mặt bằng", phong_tro: "Phòng trọ", khac: "BĐS" };
for (const x of all) {
  if ((x.title || "").trim().length < 15) {
    const extra = [KIND_VI[x.property_type] || "BĐS", x.area_m2 ? `${x.area_m2}m²` : null, x.district || x.province].filter(Boolean).join(" ");
    x.title = `${(x.title || "").trim()} - ${extra}`.replace(/^- /, "");
  }
}

// ---- Dedupe ----
// 1) trong-nguồn theo id
// 2) liên nguồn theo phone (khi có) hoặc theo "vân tay" tiêu đề+giá+DT+quận (không cần phone -
//    trước đây key chỉ dựa vào phone_hash mà chỉ nhadat.vn sinh ra -> 0% tin có key -> dedupe liên nguồn chết)
// 3) fallback (site|title|giá) trong cùng nguồn
// Tin trùng liên nguồn: GIỮ bản đầy đủ hơn (nhiều ảnh/mô tả dài) và cộng source_count -> UI "xuất hiện trên N nguồn"
const stripAccent = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D");
// Từ marketing chung - không mang thông tin nhận dạng (tránh gộp nhầm các tin cùng "template" tiêu đề)
const STOP = new Set(("nha dep gia tot chinh chu can ban gap nhanh hot cho thue dat tai o ngay lh lien he dau tu sinh loi " +
  "sieu re soc uu dai co hoi vang hiem thuong luong tl tang cap ma so mat tien mt view thoang mat sat ke gan " +
  "moi xay tang lau full noi that ngay san sang so hong so do rieng phap ly ro rang xem la thich the").split(" "));
function titleFingerprint(x) {
  if (!x.price_vnd || !(x.area_m2 || x.district)) return null;   // thiếu giá hoặc thiếu cả DT lẫn quận -> không đủ đặc trưng
  const t = stripAccent((x.title || "").toLowerCase())
    .replace(/(\+?84|0)\d[\d .]{7,12}\d/g, " ")           // bỏ số điện thoại
    .replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim(); // bỏ emoji/ký tự đặc biệt
  const words = [...new Set(t.split(" ").filter((w) => w.length > 1 && !STOP.has(w)))].slice(0, 8);
  if (words.length < 4) return null;                            // còn quá ít từ nội dung -> bỏ qua
  const pb = Math.round(Math.log(x.price_vnd) / Math.log(1.05)); // bucket log ±5% (audit 16/8: công thức cũ luôn = 20 -> bỏ qua giá)
  const ab = x.area_m2 ? Math.round(x.area_m2) : "-";
  return [words.join(" "), pb, ab, stripAccent((x.district || "").toLowerCase())].join("|");
}
const richness = (x) => (x.images || []).length * 10 + Math.min(500, (x.description || "").length) / 50 + (x.lat ? 3 : 0);

const seenId = new Set(), byKey = new Map(), seenTitle = new Set();
const kept = [];
for (const x of all) {
  if (seenId.has(x.id)) continue; seenId.add(x.id);
  const tk = [x.source_site, (x.title || "").toLowerCase().trim(), x.price_vnd ?? 0].join("|");
  if (x.title && seenTitle.has(tk)) continue; seenTitle.add(tk);

  const keys = [];
  if (x.phone_hash && x.price_vnd && x.area_m2)
    keys.push("p|" + [x.phone_hash, Math.round(x.price_vnd / 1e6), Math.round(x.area_m2), x.district].join("|"));
  const fp = titleFingerprint(x); if (fp) keys.push("t|" + fp);

  const dup = keys.map((k) => byKey.get(k)).find(Boolean);
  if (dup) {
    if (process.env.DEBUG_DEDUPE) console.error(`  gộp [${x.source_site}] "${(x.title || "").slice(0, 55)}" ${x.price_vnd}/${x.area_m2}\n   -> [${dup.source_site}] "${(dup.title || "").slice(0, 55)}" ${dup.price_vnd}/${dup.area_m2}`);
    if (dup.source_site !== x.source_site) {
      dup.source_count += 1;
      dup.source_sites = [...new Set([...(dup.source_sites || [dup.source_site]), x.source_site])];
    }
    // giữ bản giàu dữ liệu hơn nhưng bảo toàn danh tính (id/source_post_id/first-seen) của bản đầu
    if (richness(x) > richness(dup)) {
      const keepIdent = { id: dup.id, source: dup.source, source_site: dup.source_site, url: dup.url, source_post_id: dup.source_post_id,
        source_count: dup.source_count, source_sites: dup.source_sites, posted_at: dup.posted_at ?? x.posted_at };
      Object.assign(dup, x, keepIdent);
    }
    for (const k of keys) if (!byKey.has(k)) byKey.set(k, dup); // key của x cũng trỏ về dup (audit: tin thứ 3 trùng x lọt lưới)
    continue;
  }
  for (const k of keys) byKey.set(k, x);
  kept.push(x);
}
console.error("dedupe:", all.length, "->", kept.length, `(gộp ${all.length - kept.length}, ${kept.filter((x) => x.source_count > 1).length} tin xuất hiện ≥2 nguồn)`);
all = kept;

// ---- Cảnh báo giá lệch (price_flag) trên TOÀN BỘ dữ liệu ----
// Trước đây chỉ crawl.js (nhadat.vn) sinh price_warning -> nguồn đó 0 tin -> 0% tin có cờ.
// Cụm = tỉnh|quận|loại|bán-thuê; so theo giá/m² (thuê không có DT thì so theo giá). Cần >=5 tin & >=2 người đăng khác nhau.
const median = (arr) => { const s = [...arr].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const clusters = new Map();
for (const x of all) {
  if (!x.price_vnd || !x.district) continue;
  const v = x.price_per_m2 || (x.listing_type === "cho_thue" ? x.price_vnd : null);
  if (!v) continue;
  const ck = [x.province, x.district, x.property_type, x.listing_type, x.price_per_m2 ? "m2" : "abs"].join("|");
  if (!clusters.has(ck)) clusters.set(ck, []);
  clusters.get(ck).push({ x, v, poster: x.phone_hash || x.poster_id || x.id });
}
let flagged = 0;
for (const rows of clusters.values()) {
  const posters = new Set(rows.map((r) => r.poster));
  if (rows.length < 5 || posters.size < 2) continue;
  const med = median(rows.map((r) => r.v));
  if (!med) continue;
  for (const { x, v } of rows) {
    const dev = (v - med) / med;
    if (Math.abs(dev) >= 0.28) {
      x.price_warning = { reason: dev > 0 ? "cao_hon" : "thap_hon", deviation_pct: Math.round(dev * 100),
        cluster_size: rows.length, distinct_posters: posters.size, median_vnd: Math.round(med), basis: x.price_per_m2 ? "m2" : "gia" };
      flagged++;
    }
  }
}
// điểm heuristic phải phản ánh cờ giá vừa tính (nguồn tự chấm giữ nguyên, chỉ trừ thêm khi có cờ)
for (const x of all) if (x.price_warning && x.ai_score) x.ai_score = Math.max(35, x.ai_score - 12);
console.error("price_flag:", flagged, "tin lệch ≥28% so với trung vị cụm (", clusters.size, "cụm )");

// ---- Lý do dấu hiệu môi giới/chính chủ (cho nguồn chưa tự sinh) ----
for (const x of all) {
  if (x.poster_reasons.length) continue;
  const r = [];
  if (x.poster_listing_count >= 3) r.push(`tai_khoan_dang_${x.poster_listing_count}_tin`);
  if (/chính chủ|chinh chu/i.test((x.title || "") + " " + (x.description || "").slice(0, 300))) r.push("tu_xung_chinh_chu");
  if (/môi giới|moi gioi|sàn giao dịch|chuyên viên|chuyen vien|nhận ký gửi/i.test((x.title || "") + " " + (x.description || "").slice(0, 400))) r.push("tu_xung_moi_gioi");
  x.poster_reasons = r;
  if (x.poster_role === "khong_ro") {
    if (r.includes("tu_xung_moi_gioi") || x.poster_listing_count >= 3) x.poster_role = "moi_gioi";
    else if (r.includes("tu_xung_chinh_chu")) x.poster_role = "chu_nha";
  }
}

const summary = {
  crawled_at: new Date().toISOString().slice(0, 10), total: all.length,
  by_source: all.reduce((a, x) => ((a[x.source_site] = (a[x.source_site] || 0) + 1), a), {}),
  by_city: all.reduce((a, x) => ((a[x.province] = (a[x.province] || 0) + 1), a), {}),
  with_geo: all.filter((x) => x.lat).length, with_ward: all.filter((x) => x.ward).length,
  ban: all.filter((x) => x.listing_type === "ban").length, cho_thue: all.filter((x) => x.listing_type === "cho_thue").length,
  multi_source: all.filter((x) => x.source_count > 1).length, price_flagged: all.filter((x) => x.price_warning).length,
  with_posted_at: all.filter((x) => x.posted_at).length, with_phone_masked: all.filter((x) => x.phone_masked).length,
};
fs.writeFileSync(new URL("./combined.json", import.meta.url), JSON.stringify({ summary, listings: all }, null, 0));
console.error("MERGED", JSON.stringify(summary));
