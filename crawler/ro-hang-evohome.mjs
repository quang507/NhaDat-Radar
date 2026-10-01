// RỔ HÀNG EVOHOME / HIFRIENDZ (28/9) - phòng trống cho thuê Radar trực tiếp nắm -> listings (source='ro_hang').
//
//   node --env-file=.env.local crawler/ro-hang-evohome.mjs [crawler/private/evohome.json]
//
// Đầu vào: file JSON đã chuẩn hoá (mảng tin kiểu Radar, có specs "Loại phòng/Số phòng/Hoa hồng..."),
// để trong crawler/private/ (gitignore - repo PUBLIC mà file có số nhà thật + hoa hồng).
//
// Quy tắc bán hàng áp khi đưa lên web (bảng listings đọc công khai):
//   A. Che số nhà kiểu EvoHome (1/10): hẻm "86/23/2 Thích Quảng Đức" -> "86/•• Thích Quảng Đức";
//      mặt tiền "166 Nguyễn Thái Sơn" -> "16• Nguyễn Thái Sơn" (che-dia-chi.mjs). Toạ độ lệch ~50-75 m, lệch THEO TOÀ NHÀ (mọi phòng cùng toà
//      cùng một điểm) - lệch từng phòng một hướng khác nhau thì lấy trung bình các ghim là ra nhà thật.
//   B. Không ghi thời hạn hợp đồng; cuối mô tả là câu mời xem phòng + thương lượng trực tiếp.
//   D. Không link bài gốc (source_url null), không hoa hồng/số phòng; SĐT duy nhất là hotline Radar.
// Bản gốc (số nhà, toạ độ thật, hoa hồng, số phòng) vào bảng listing_ro_hang - chỉ admin đọc.
//
// Phòng không còn trong file mới (đã cho thuê) -> status 'gone'.
// Không có SUPABASE_SERVICE_ROLE_KEY: chỉ ghi ra crawler/private/evohome-rows.json để đẩy cách khác.
import fs from "node:fs";
import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { smartGeocode, LOI } from "./geo.mjs";
import { hash31, laAnh, laVideo } from "./chung.mjs";
import { cheDiaChi } from "./che-dia-chi.mjs";

const PARTNER = "evohome";
const HOTLINE = "0346689460";
const FILE = process.argv[2] || "crawler/private/evohome.json";
const OUT = "crawler/private/evohome-rows.json";

const src = JSON.parse(fs.readFileSync(FILE, "utf8"));
console.log(`Rổ hàng ${PARTNER}: ${src.length} phòng trong ${FILE}`);

const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

// ---- A. che số nhà: chỉ che phần nhỏ nhất kiểu EvoHome ("86/23/2" -> "86/••") - che-dia-chi.mjs ----
const gon = (s) => String(s || "").replace(/\s+,/g, ",").replace(/\s+/g, " ").trim();

function lechToaDo(lat, lng, hatGiong) {
  const h = Math.abs(hash31(hatGiong));
  const goc = ((h % 360) * Math.PI) / 180;
  const met = 50 + ((h >>> 9) % 26);           // 50-75 m
  return {
    lat: +(lat + (met * Math.cos(goc)) / 111320).toFixed(6),
    lng: +(lng + (met * Math.sin(goc)) / (111320 * Math.cos((lat * Math.PI) / 180))).toFixed(6),
  };
}

const tenQuan = (d) => {
  const s = gon(d);
  if (!s) return null;
  if (/^\d+$/.test(s)) return `Quận ${Number(s)}`;
  if (/^(quận|huyện|tp\.?|thành phố|thị xã)\s/i.test(s)) return s;
  return /^(bình chánh|nhà bè|hóc môn|củ chi|cần giờ)$/i.test(s) ? `Huyện ${s}` : `Quận ${s}`;
};
const giaTrieu = (v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1).replace(/\.0$/, "").replace(".", ",")} triệu` : `${v.toLocaleString("vi-VN")} đ`);

// ---- đọc tin cũ để giữ id / first_seen_at / toạ độ thật đã geocode --------------------------
const cu = new Map();
if (sb) {
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from("listings").select("id,source_post_id,first_seen_at,crawl_count,status")
      .eq("source", "ro_hang").eq("source_site", PARTNER).range(from, from + 999);
    if (error) throw error;
    for (const r of data) cu.set(r.source_post_id, r);
    if (data.length < 1000) break;
  }
  console.log(`Đã có trong DB: ${cu.size}`);
}

// ---- toạ độ thật ĐÃ LƯU của phòng cũ (listing_ro_hang) -> khỏi geocode lại mỗi lượt ------------
// 30/9: mỗi lượt geocode lại ~124 địa chỉ (Nominatim 1 req/s + thử 2 biến thể) = ~10 phút / 12 phút chạy.
const daLuu = new Map();   // listing_id -> { lat, lng }
if (sb && cu.size) {
  const ids = [...cu.values()].map((r) => r.id);
  for (let i = 0; i < ids.length; i += 300) {
    const { data, error } = await sb.from("listing_ro_hang").select("listing_id,exact_lat,exact_lng").in("listing_id", ids.slice(i, i + 300));
    if (error) throw error;
    for (const r of data) if (r.exact_lat != null && r.exact_lng != null) daLuu.set(r.listing_id, { lat: r.exact_lat, lng: r.exact_lng });
  }
}

// ---- geocode bù (Nominatim ~1 req/s) cho phòng MỚI, cache ra file để lượt sau khỏi tra lại ------
// File nằm trong crawler/private/ (gitignore - chứa địa chỉ thật). Tra không ra (null) thì 7 ngày sau mới thử lại.
const FILE_CACHE = "crawler/private/geocode-cache.json";
const THU_LAI_MS = 7 * 864e5;
let fileCache = {};
try { fileCache = JSON.parse(fs.readFileSync(FILE_CACHE, "utf8")); } catch { /* chưa có file */ }
const geoCache = new Map();
let soTraMoi = 0, soDungLai = 0;
async function toaDoThat(x) {
  if (x.lat != null && x.lng != null) return { lat: x.lat, lng: x.lng, precision: "nguon" };
  const luu = daLuu.get(cu.get(x.source_post_id)?.id);
  if (luu) { soDungLai++; return { ...luu, precision: "duong" }; }
  const q = gon([x.address?.split(",")[0], x.ward, tenQuan(x.district), "Hồ Chí Minh"].filter(Boolean).join(", "));
  const f = fileCache[q];
  if (f && (f.lat != null || Date.now() - f.t < THU_LAI_MS)) { soDungLai++; return f.lat != null ? { lat: f.lat, lng: f.lng, precision: "duong" } : null; }
  if (process.env.NO_GEOCODE) return null;   // máy không ra được mạng ngoài: để null, ghim sau theo phường
  if (!geoCache.has(q)) {
    let g = await smartGeocode(q);
    if (!g || g === LOI) g = await smartGeocode(gon([x.ward, tenQuan(x.district), "Hồ Chí Minh"].filter(Boolean).join(", ")));
    const kq = g && g !== LOI ? g : null;
    geoCache.set(q, kq);
    // LOI = lỗi mạng/giới hạn -> không ghi cache (lượt sau thử lại); null thật = không tìm thấy -> ghi kèm thời điểm
    if (g !== LOI) fileCache[q] = kq ? { lat: kq.lat, lng: kq.lng, t: Date.now() } : { lat: null, t: Date.now() };
    soTraMoi++;
    await new Promise((r) => setTimeout(r, 1100));
  }
  const g = geoCache.get(q);
  return g ? { lat: g.lat, lng: g.lng, precision: "duong" } : null;
}

// ---- dựng hàng ------------------------------------------------------------------------------
const now = new Date().toISOString();
const rows = [], priv = [];
for (const x of src) {
  if (!x.source_post_id || !x.price_vnd) continue;
  const specs = x.specs || {};
  const dauDiaChi = gon(String(x.address || "").split(",")[0]);
  const diaChiChe = cheDiaChi(dauDiaChi);
  const quan = tenQuan(x.district);
  const loai = specs["Loại phòng"] || (x.kind === "can_ho" ? "Căn hộ" : "Phòng trọ");
  const dt = Number(x.area_m2) || null;

  const that = await toaDoThat(x);
  const lech = that ? lechToaDo(that.lat, that.lng, `${PARTNER}|${dauDiaChi.toLowerCase()}`) : null;

  // B. mô tả: bỏ hợp đồng + khối liên hệ/SĐT, thay số nhà bằng bản che, chốt bằng câu mời xem phòng
  const cheThuong = diaChiChe ? diaChiChe.charAt(0).toLowerCase() + diaChiChe.slice(1) : "khu vực";   // "tại 86/•• Thích Quảng Đức..."
  const moTa = String(x.description || "").split("\n")
    .filter((l) => !/hợp đồng|liên hệ|hotline|zalo|\d{9,}/i.test(l))
    .map(gon)   // nguồn hay có khoảng trắng kép -> không chuẩn hoá thì split theo địa chỉ trượt, lộ số nhà
    .join("\n")
    .split(dauDiaChi).join(cheThuong)
    .replace(/\n{3,}/g, "\n\n").trim()
    + `\n\n💬 Giá niêm yết ${giaTrieu(x.price_vnd)}/tháng. Anh/chị qua xem phòng thực tế, ưng ý Radar hỗ trợ thương lượng giá và hợp đồng tốt nhất với chủ nhà.`;

  const anh = (x.images || []).filter(laAnh).slice(0, 20);
  const cuRow = cu.get(x.source_post_id);
  const id = cuRow?.id || crypto.randomUUID();
  rows.push({
    id,
    source: "ro_hang",
    source_site: PARTNER,
    source_post_id: x.source_post_id,
    source_url: null,
    deal: "cho_thue",
    kind: x.kind === "can_ho" ? "can_ho" : "phong_tro",
    // "Gò Vấp" gọn hơn "Quận Gò Vấp", nhưng quận số phải giữ chữ "Quận" ("..., 7" vô nghĩa)
    title: `${loai}${dt ? ` ${dt}m²` : ""} - ${[diaChiChe || x.ward, quan && (/^Quận \d/.test(quan) ? quan : quan.replace(/^(Quận|Huyện) /, ""))].filter(Boolean).join(", ")}`,
    description: moTa,
    price_vnd: x.price_vnd,
    area_m2: dt,
    province: "Hồ Chí Minh",
    district: quan,
    ward: x.ward || null,
    address: [diaChiChe, x.ward].filter(Boolean).join(", "),
    lat: lech?.lat ?? null,
    lng: lech?.lng ?? null,
    geo_precision: lech ? "duong" : null,
    // ảnh trước (thẻ tin dùng ảnh đầu), video (tối đa 2) nối cuối -> trang chi tiết phát được
    images: [...anh, ...(x.images || []).filter(laVideo).slice(0, 2)],
    amenities: Array.isArray(x.amenities) ? x.amenities : [],   // khoá TIEN_ICH (evohome-fetch.mjs)
    specs: Object.fromEntries(Object.entries(specs).filter(([k]) => !/hoa hồng|số phòng/i.test(k))),
    contact_name: "NhaDat Radar",
    contact_phone: HOTLINE,
    trust_score: 95,
    poster_role_guess: null,
    poster_reasons: ["Rổ hàng Radar - phòng trống đã xác thực"],
    // không còn ảnh nào (EvoHome không có ảnh, hoặc chỉ có video) -> tạm ẩn: thẻ không ảnh khó bán
    // và trông như tin lỗi. Lượt sau đối tác bổ sung ảnh thì tự hiện lại.
    status: anh.length ? "published" : "hidden",
    posted_at: x.posted_at || now,
    first_seen_at: cuRow?.first_seen_at || now,
    last_seen_at: now,
    last_confirmed_at: now,
    crawl_count: (cuRow?.crawl_count || 0) + 1,
  });
  priv.push({
    listing_id: id,
    partner: PARTNER,
    exact_address: x.address || null,
    exact_lat: that?.lat ?? null,
    exact_lng: that?.lng ?? null,
    commission: specs["Hoa hồng môi giới"] || null,
    unit_code: specs["Số phòng"] || null,
    raw: { title: x.title, specs, posted_at: x.posted_at },
    updated_at: now,
  });
}
console.log(`Ẩn ${rows.filter((r) => r.status === "hidden").length} phòng không có ảnh (hoặc chỉ có video)`);
try { fs.writeFileSync(FILE_CACHE, JSON.stringify(fileCache)); } catch (e) { console.warn("Không ghi được cache toạ độ:", e.message); }
console.log(`Dựng ${rows.length} tin · có toạ độ ${rows.filter((r) => r.lat != null).length} · toạ độ dùng lại ${soDungLai} · tra mới ${soTraMoi} địa chỉ`);

if (!sb) {
  fs.writeFileSync(OUT, JSON.stringify({ rows, priv }));
  console.log(`Không có SUPABASE_SERVICE_ROLE_KEY -> chỉ ghi ${OUT}`);
  process.exit(0);
}

// ---- ghi DB ---------------------------------------------------------------------------------
for (let i = 0; i < rows.length; i += 200) {
  const { error } = await sb.from("listings").upsert(rows.slice(i, i + 200), { onConflict: "id" });
  if (error) throw error;
  const { error: e2 } = await sb.from("listing_ro_hang").upsert(priv.slice(i, i + 200), { onConflict: "listing_id" });
  if (e2) throw e2;
}
// phòng đã hết (không còn trong file) -> gone
const conLai = new Set(rows.map((r) => r.source_post_id));
// chỉ tính phòng CHƯA hạ (bản cũ đếm lại cả phòng đã "gone" từ lượt trước -> lượt nào cũng báo "hạ 30")
let het = [...cu.values()].filter((r) => !conLai.has(r.source_post_id) && r.status !== "gone").map((r) => r.id);
// lượt cào hụt (EvoHome lỗi giữa chừng) mà vẫn hạ thì nửa rổ hàng biến mất khỏi web -> chỉ hạ khi đủ lớn
// so với số phòng ĐANG HIỆN (không tính phòng đã gone - chúng tích luỹ dần, làm ngưỡng ngày càng cao, sớm muộn chặn nhầm)
const dangHien = [...cu.values()].filter((r) => r.status !== "gone").length;
if (rows.length < dangHien * 0.5) { console.warn(`Chỉ ${rows.length}/${dangHien} phòng - nghi lượt cào hụt, KHÔNG hạ phòng nào`); het = []; }
for (let i = 0; i < het.length; i += 100) {
  await sb.from("listings").update({ status: "gone" }).in("id", het.slice(i, i + 100));
}
console.log(`✓ Ghi ${rows.length} phòng · hạ ${het.length} phòng đã cho thuê`);
