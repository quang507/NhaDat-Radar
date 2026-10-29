// CÀO RỔ HÀNG HIFRIENDZ (2/10) - phòng TRỐNG của đối tác HiFriendz (Radar là đối tác bán hàng).
//
//   node crawler/hifriendz-fetch.mjs            -> crawler/private/hifriendz.json
//   RO_HANG_PARTNER=hifriendz node --env-file=.env.local crawler/ro-hang-evohome.mjs   (đưa lên web)
//
// KHÔNG cần tài khoản: dữ liệu công khai trên hifriendz.com đã đủ - mã tin đầy đủ (LST-...) và số phòng
// (roomCode) nằm trong payload trang toà nhà, giao diện chỉ cắt bớt cho gọn.
//   1. POST /api/search/public {groupByProject:true} -> danh sách toà (tối đa 48 toà/trang, ~7.400 toà)
//   2. GET /du-an/<id> với header RSC:1 (payload React, nhẹ hơn HTML ~4 lần) -> mảng "rooms" của toà
// Địa chỉ HiFriendz chỉ có TÊN ĐƯỜNG (không số nhà), toạ độ publicLatitude đã được họ làm lệch sẵn.
//
// Lọc (chốt 2/10): chỉ phòng TRỐNG có ẢNH, mỗi toà TỐI ĐA 5 phòng trải đều khoảng giá - toà 140 phòng
// giống nhau không được lấp kín trang kết quả.
//
// Tăng tốc (28/10): bước 2 tốn ~20 phút vì đọc lần lượt ~7.450 trang toà. Danh sách toà ở bước 1 đã có số
// phòng, số phòng trống, khoảng giá, loại phòng, ảnh -> so dấu vân tay toà với lượt trước, toà không đổi thì
// lấy lại phòng của nó trong file cũ, chỉ đọc trang toà đã đổi. Phòng đổi mà số đếm/giá không đổi (thuê 1
// phòng, trống 1 phòng khác cùng giá) không lộ ra ở danh sách -> cứ quá 20 giờ thì quét đủ một lượt; sửa file
// này cũng tự quét đủ. Ép quét đủ: HF_QUET_DU=1.
import crypto from "node:crypto";
import fs from "node:fs";

const OUT = "crawler/private/hifriendz.json";
const GOC = "https://hifriendz.com";
const UA = { "user-agent": "Mozilla/5.0 (NhaDatRadar; doi tac ban hang)" };
const MOI_TOA = 5;
const SONG_SONG = 4;             // nhẹ tay với máy chủ đối tác
const TOI_THIEU_TOA = 1000;      // ít hơn = API đổi / lỗi -> KHÔNG ghi đè file cũ
const GIOI_HAN = Number(process.env.HF_GIOI_HAN) || Infinity;   // thử nhanh: HF_GIOI_HAN=50
const FILE_VT = "crawler/private/hifriendz-toa.json";           // dấu vân tay toà của lượt trước
const QUET_DU_SAU = 20 * 3600 * 1000;

const LOAI = { "Gác": "Gác lửng", Duplex: "Duplex", Studio: "Studio", "1PN": "1 Phòng ngủ", "2PN": "2 Phòng ngủ", "3PN": "3 Phòng ngủ" };
const tien = (n) => (!n ? "Thỏa thuận" : n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, "") + " triệu" : n.toLocaleString("vi-VN") + " đ");
const ngu = (ms) => new Promise((r) => setTimeout(r, ms));

// features HiFriendz (chữ tự do) -> khoá tiện ích Radar (src/lib/tien-ich.ts TIEN_ICH.k).
// Chữ lạ đếm ở LA để in cuối lượt -> bổ sung sau, không đoán.
const TI = [
  [/máy lạnh|điều hòa|điều hoà/i, "dieu_hoa"], [/nước nóng|nóng lạnh/i, "nuoc_nong"], [/tủ lạnh/i, "tu_lanh"],
  [/tivi|tv/i, "tivi"], [/máy giặt/i, "may_giat"], [/tủ (quần )?áo/i, "tu_quan_ao"], [/giường|nệm/i, "giuong"],
  [/ban công/i, "ban_cong"], [/thang máy/i, "thang_may"], [/(để|giữ|hầm) xe|bãi xe/i, "de_xe"], [/thú cưng|pet/i, "thu_cung"],
  [/sân phơi/i, "san_phoi"], [/giếng trời/i, "gieng_troi"], [/xe điện|sạc/i, "xe_dien"],
  [/vân tay|camera|bảo vệ|an ninh/i, "an_ninh"], [/chung chủ|chủ chung/i, "chu_chung"], [/gác|duplex/i, "gac_lung"],
  [/bồn rửa|chậu rửa/i, "bon_rua"], [/cửa sổ/i, "cua_so"], [/kệ bếp|tủ bếp|bếp/i, "ke_bep"],
];
const LA = new Map();
const KHONG_KHOA = new Set(["Full nội thất", "WC riêng"]);   // có trong mô tả, bộ lọc chưa có ô tương ứng

// HiFriendz ghi theo địa giới 2025 (Dĩ An, Vũng Tàu... đều "TP.HCM") và "Thành Phố Thủ Đức"; DB Radar dùng
// tỉnh CŨ + "TP. X" như các nguồn khác ("Bình Dương | TP. Dĩ An", "Hồ Chí Minh | TP. Thủ Đức") để bộ lọc
// tỉnh/quận và công tắc "Địa chỉ sau sáp nhập" chạy đúng.
const BINH_DUONG = /^(TP\. )?(Dĩ An|Thuận An|Thủ Dầu Một|Bến Cát|Tân Uyên|Bắc Tân Uyên|Bàu Bàng|Dầu Tiếng|Phú Giáo)$/;
const BR_VT = /^(TP\. )?(Vũng Tàu|Bà Rịa|Phú Mỹ|Châu Đức|Long Điền|Đất Đỏ|Xuyên Mộc|Côn Đảo)$/;
function quanTinh(d) {
  const q = String(d || "").trim().replace(/^Thành [Pp]hố /, "TP. ").replace(/^Thị [Xx]ã /, "TX. ");
  const ten = q.replace(/^(TP\.|TX\.|Huyện) /, "");
  if (BINH_DUONG.test(ten)) return { quan: q, tinh: "Bình Dương" };
  if (BR_VT.test(ten)) return { quan: q, tinh: "Bà Rịa - Vũng Tàu" };
  return { quan: q || null, tinh: "Hồ Chí Minh" };
}
function tienIch(r) {
  const ti = new Set();
  for (const f of r.features || []) {
    const hit = TI.filter(([re]) => re.test(f));
    if (!hit.length && !KHONG_KHOA.has(f)) LA.set(f, (LA.get(f) || 0) + 1);
    for (const [, k] of hit) ti.add(k);
  }
  if (r.hasBalcony) ti.add("ban_cong");
  if (r.hasWindow) ti.add("cua_so");
  if (/gác|duplex/i.test(r.listingType || "")) ti.add("gac_lung");
  return [...ti];
}

// 429 = HiFriendz chặn vì gọi dày (29/10: lượt 06:00 trên NUC chết ở trang danh sách sau 3 lần thử cách vài giây).
// Gặp 429 thì chờ theo Retry-After, không có thì 30 s -> 1 phút -> 2 phút -> 4 phút rồi mới bỏ.
const CHO_429 = [30_000, 60_000, 120_000, 240_000];
class QuaDay extends Error {
  constructor(r) { super("HTTP 429"); const s = Number(r.headers.get("retry-after")); this.cho = s > 0 ? Math.min(s, 600) * 1000 : 0; }
}
const loiHttp = (r) => (r.status === 429 ? new QuaDay(r) : new Error(`HTTP ${r.status}`));
async function choQuaDay(e, lan429, viec) {
  const cho = e.cho || CHO_429[lan429];
  console.warn(`  HiFriendz báo gọi quá dày (429) ở ${viec} - chờ ${Math.round(cho / 1000)} s`);
  await ngu(cho);
}

async function layJson(body, lan = 0, lan429 = 0) {
  try {
    const r = await fetch(`${GOC}/api/search/public`, { method: "POST", headers: { ...UA, "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) throw loiHttp(r);
    return await r.json();
  } catch (e) {
    if (e instanceof QuaDay && lan429 < CHO_429.length) { await choQuaDay(e, lan429, `trang ${body.page}`); return layJson(body, lan, lan429 + 1); }
    if (lan >= 3) throw e;
    await ngu(2000 * (lan + 1));
    return layJson(body, lan + 1, lan429);
  }
}

/** mảng "rooms" trong payload RSC của trang toà nhà (bóc theo cặp ngoặc - payload không phải JSON trọn vẹn) */
async function phongCuaToa(id, lan = 0, lan429 = 0) {
  try {
    const r = await fetch(`${GOC}/du-an/${encodeURIComponent(id)}`, { headers: { ...UA, RSC: "1" } });
    if (!r.ok) throw loiHttp(r);
    const t = await r.text();
    const k = t.indexOf('"rooms":[');
    if (k < 0) return [];
    let sau = 0, i = k + 8;
    for (; i < t.length; i++) {
      const c = t[i];
      if (c === '"') { i++; while (i < t.length && t[i] !== '"') { if (t[i] === "\\") i++; i++; } continue; }
      if (c === "[") sau++;
      else if (c === "]" && --sau === 0) break;
    }
    return JSON.parse(t.slice(k + 8, i + 1));
  } catch (e) {
    if (e instanceof QuaDay && lan429 < CHO_429.length) { await choQuaDay(e, lan429, `toà ${id}`); return phongCuaToa(id, lan, lan429 + 1); }
    if (lan >= 2) { console.warn(`Bỏ toà ${id}: ${e.message}`); return null; }
    await ngu(3000 * (lan + 1));
    return phongCuaToa(id, lan + 1, lan429);
  }
}

/** loại tin Radar từ listingType HiFriendz (chữ tự do: "Studio", "Mặt bằng", "2PN 1PK 2WC", "Nhà nguyên căn"...).
 *  Studio/Gác/Duplex/Phòng: như EvoHome - từ 35 m² tính căn hộ (dịch vụ), nhỏ hơn là phòng trọ. */
function loaiTin(loai, dt) {
  const t = String(loai || "");
  if (/mặt bằng|kiot|kiốt/i.test(t)) return "mat_bang";
  if (/nguyên căn|trệt/i.test(t)) return "nha";
  if (/\dPN|phòng ngủ|căn hộ|penthouse|penthhouse|nguyên tầng/i.test(t)) return "can_ho";
  return (dt || 0) >= 35 ? "can_ho" : "phong_tro";
}

/** tối đa n phòng trải đều khoảng giá (rẻ nhất, đắt nhất và các mức giữa) */
function chonDeu(ds, n) {
  const s = [...ds].sort((a, b) => (a.price || 0) - (b.price || 0));
  if (s.length <= n) return s;
  return [...new Set(Array.from({ length: n }, (_, i) => Math.round((i * (s.length - 1)) / (n - 1))))].map((i) => s[i]);
}

// ---- 1. danh sách toà -----------------------------------------------------------------------
const dau = await layJson({ page: 1, pageSize: 48, groupByProject: true });
const tongToa = dau.projectTotal || 0;
const soTrang = Math.ceil(tongToa / 48);
console.log(`HiFriendz: ${tongToa} toà · ${dau.total} phòng · ${soTrang} trang danh sách`);
const toa = new Map(dau.projects.map((p) => [p.id, p]));
for (let p = 2; p <= soTrang && toa.size < GIOI_HAN; p++) {
  const j = await layJson({ page: p, pageSize: 48, groupByProject: true });
  for (const x of j.projects || []) toa.set(x.id, x);
  if (p % 25 === 0) console.log(`  danh sách: trang ${p}/${soTrang} · ${toa.size} toà`);
  await ngu(400);   // 150 ms từng bị 429 (29/10)
}
const dsToa = [...toa.values()].filter((p) => (p.availableRoomCount ?? p.roomCount ?? 1) > 0).slice(0, GIOI_HAN);
console.log(`Có ${dsToa.length} toà còn phòng trống`);
if (GIOI_HAN === Infinity && dsToa.length < TOI_THIEU_TOA) { console.error(`Quá ít toà (<${TOI_THIEU_TOA}) - giữ nguyên ${OUT} cũ`); process.exit(1); }

// ---- 2. phòng của từng toà ------------------------------------------------------------------
// mã phiên bản = nội dung file này: sửa cách chuẩn hoá thì phòng lấy lại từ file cũ đã lỗi thời -> quét đủ
const PHIEN_BAN = crypto.createHash("sha1").update(fs.readFileSync(new URL(import.meta.url))).digest("base64").slice(0, 12);
const vanTayToa = (p) => crypto.createHash("sha1").update(JSON.stringify([
  p.roomCount, p.availableRoomCount, p.priceMin, p.priceMax, p.listingTypes, p.features, p.cover, p.images,
  p.street, p.ward, p.newWard, p.district, p.publicLatitude, p.publicLongitude,
])).digest("base64");
let vtCu = {};
try { vtCu = JSON.parse(fs.readFileSync(FILE_VT, "utf8")); } catch { /* lần đầu */ }
let quetDu = process.env.HF_QUET_DU === "1" || vtCu.phienBan !== PHIEN_BAN || !(Date.now() - Date.parse(vtCu.quetDuLuc || 0) < QUET_DU_SAU);
const phongCu = new Map();   // mã toà -> phòng đã chuẩn hoá ở lượt trước
if (!quetDu) {
  try {
    for (const x of JSON.parse(fs.readFileSync(OUT, "utf8"))) {
      const id = x.specs?.["Mã toà HiFriendz"];
      if (!phongCu.has(id)) phongCu.set(id, []);
      phongCu.get(id).push(x);
    }
  } catch { quetDu = true; }   // mất file phòng cũ thì dấu vân tay vô nghĩa
}
console.log(quetDu ? "Quét đủ mọi toà" : `Chỉ đọc toà đã đổi (lần quét đủ gần nhất ${vtCu.quetDuLuc})`);

const out = [];
const vtMoi = {};
let xong = 0, loi = 0, tongPhong = 0, dungLai = 0;
const hang = [...dsToa];
async function tho() {
  for (let p; (p = hang.shift()); ) {
    const vt = vanTayToa(p);
    if (!quetDu && vtCu.toa?.[p.id] === vt) {
      xong++; dungLai++;
      vtMoi[p.id] = vt;
      out.push(...(phongCu.get(p.id) || []));   // toà không có phòng trống có ảnh thì không có dòng nào
      continue;
    }
    const rooms = await phongCuaToa(p.id);
    xong++;
    if (rooms === null) {
      // đọc hỏng: giữ phòng lượt trước (nếu có) thay vì để bước đồng bộ hạ cả toà; không ghi vân tay -> lượt sau đọc lại
      loi++;
      out.push(...(phongCu.get(p.id) || []));
      continue;
    }
    vtMoi[p.id] = vt;
    tongPhong += rooms.length;
    const trong = rooms.filter((r) => !r.isRented && (!r.status || r.status === "Trống") && (r.images || []).length > 0 && r.price > 0);
    for (const r of chonDeu(trong, MOI_TOA)) out.push(chuanHoa(r, p));
    if (xong % 200 === 0) console.log(`  toà ${xong}/${dsToa.length} · lấy ${out.length} phòng · lỗi ${loi}`);
    await ngu(200);
  }
}

function chuanHoa(r, p) {
  const loai = LOAI[r.listingType] || r.listingType || "Phòng";
  const dt = Number(r.area) || null;
  const phuong = r.ward || r.newWard || p.ward || "";
  const duong = r.street || p.street || "";
  const ti = tienIch(r);
  const { quan, tinh } = quanTinh(r.district || p.district);
  const tn = [...new Set([...(r.features || []), r.furnitureLevel].filter(Boolean))];
  const moTa = [
    `🏠 Cho thuê ${loai} tại ${[duong, phuong, quan, tinh].filter(Boolean).join(", ")}.`,   // importer đổi "<đường>" -> "khu vực <đường>"
    `• Diện tích: ${dt ? dt + " m²" : "Rộng rãi thoáng mát"}`,
    `• Giá thuê: ${tien(r.price)}/tháng`,
    r.availableDate ? `• Nhận phòng từ: ${r.availableDate}` : "",
    "✨ TIỆN NGHI PHÒNG:",
    ...(tn.length ? tn.map((t) => `• ${t}`) : ["• Đầy đủ tiện nghi cơ bản"]),
  ].filter(Boolean).join("\n");
  const anh = (r.media || []).filter((m) => m.type === "image").map((m) => m.url);
  const video = (r.media || []).filter((m) => m.type === "video").map((m) => m.url);
  return {
    source_post_id: r.id,                         // mã tin đầy đủ LST-...
    posted_at: null,
    description: moTa,
    price_vnd: r.price,
    area_m2: dt,
    kind: loaiTin(r.listingType, dt),
    province: tinh,
    district: quan,
    ward: phuong || null,
    address: [duong, phuong, quan, tinh].filter(Boolean).join(", "),
    lat: r.publicLatitude ?? p.publicLatitude ?? null,   // toạ độ CÔNG KHAI (HiFriendz đã làm lệch)
    lng: r.publicLongitude ?? p.publicLongitude ?? null,
    images: [...(anh.length ? anh : r.images || []), ...video],
    amenities: ti,
    specs: {
      "Loại phòng": loai,
      "Số phòng": r.roomCode || "-",             // chỉ admin thấy (ro-hang-evohome.mjs lọc khỏi bản công khai)
      "Nội thất": r.furnitureLevel || "-",
      "Mã toà HiFriendz": p.id,
    },
  };
}

await Promise.all(Array.from({ length: SONG_SONG }, tho));
console.log(`Đọc ${xong - dungLai} toà, dùng lại ${dungLai} toà không đổi (${loi} lỗi) · ${tongPhong} phòng ở toà đã đọc · tổng ${out.length} phòng trống có ảnh (tối đa ${MOI_TOA}/toà)`);
if (LA.size) console.log("Tiện ích HiFriendz chưa map:", Object.fromEntries([...LA].sort((a, b) => b[1] - a[1]).slice(0, 30)));
if (GIOI_HAN === Infinity && loi > dsToa.length * 0.2) { console.error(`Lỗi quá nhiều (${loi}) - giữ nguyên ${OUT} cũ`); process.exit(1); }
fs.mkdirSync("crawler/private", { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out));
fs.writeFileSync(FILE_VT, JSON.stringify({ phienBan: PHIEN_BAN, quetDuLuc: quetDu ? new Date().toISOString() : vtCu.quetDuLuc, toa: vtMoi }));
console.log(`✓ Ghi ${out.length} phòng -> ${OUT}`);
