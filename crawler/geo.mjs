// Geocode dùng chung: ưu tiên Vietmap (chính xác cho VN, không chặn IP CI),
// fallback Nominatim (OpenStreetMap free). Mọi request có timeout 8s.
const VIETMAP_KEY = process.env.VIETMAP_API_KEY || "";
const NOMINATIM_UA = "NhaDatRadar/1.0 (proptech)";

async function fetchJSON(url, headers = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(url, { headers, signal: ctrl.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
  finally { clearTimeout(timer); }
}

// ---------------------------------------------------------------------------
// KIỂM TRA KẾT QUẢ CÓ ĐÚNG TỈNH KHÔNG
//
// Vietmap khớp mờ và luôn trả về thứ gần giống nhất, KHÔNG cần đúng tỉnh. Đo thật 19/8:
//   "Phường Tân Khánh, Hồ Chí Minh"  -> trả "Phường An Khánh, Thủ Đức"      (sai phường)
//   "Phường Tân Khánh, Bình Dương"   -> trả "Phường Tân Khánh, LONG AN"     (sai tỉnh)
//   "Xã Tân Vĩnh Hiệp, Tân Uyên"     -> trả "Hội Người Mù ... Uyên Hưng"    (ra điểm POI)
// Nhận bừa kết quả đầu là ghim tin Bình Dương xuống Long An — sai kiểu này TỆ HƠN để trống,
// vì khách tin bản đồ mà chạy nhầm tỉnh. Nominatim cũng có kiểu trả lệch tương tự.
// => chỉ nhận khi tên tỉnh trong kết quả khớp tỉnh đã hỏi; không khớp thì thà không có ghim.
const boDau = (s) => (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/đ/gi, "d").toLowerCase();

// bỏ tiền tố hành chính để so tên trần: "Tỉnh Bình Dương" ~ "Binh Duong"
const tenTran = (s) => boDau(s)
  .replace(/\b(tinh|thanh pho|tp\.?|quan|huyen|thi xa|thi tran|phuong|xa)\b/g, " ")
  .replace(/[^a-z0-9]+/g, " ").trim();

// tỉnh nằm ở đoạn cuối của query ("Quận 7, Hồ Chí Minh, Việt Nam" -> "Hồ Chí Minh")
function tinhTrongQuery(query) {
  const phan = String(query).split(",").map((s) => s.trim())
    .filter((s) => s && !/^viet ?nam$/i.test(boDau(s)));
  return phan.length ? phan[phan.length - 1] : "";
}

// đoạn ĐẦU của query là phường/quận cần tìm ("Phường Tân Khánh, Hồ Chí Minh" -> "Tân Khánh")
function diaDanhTrongQuery(query) {
  const phan = String(query).split(",").map((s) => s.trim())
    .filter((s) => s && !/^viet ?nam$/i.test(boDau(s)));
  return phan.length > 1 ? phan[0] : "";
}

// Phải khớp CẢ tỉnh LẪN tên phường/quận. Chỉ khớp tỉnh là chưa đủ: "Phường Tân Khánh,
// Hồ Chí Minh" từng nhận nhầm "Phường An Khánh, Thủ Đức" — cùng TP.HCM nên lọt, mà lệch
// ~30km. Tên số ("Quận 7" -> "7") thì bỏ qua vế này vì một chữ số khớp lung tung.
function khopTinh(ketQua, query) {
  const kq = tenTran(ketQua);
  if (!kq) return false;

  const tinh = tenTran(tinhTrongQuery(query));
  // "ho chi minh" khớp cả "tp ho chi minh"; "ba ria vung tau" khớp "ba ria - vung tau"
  if (tinh && !(kq.includes(tinh) || tinh.includes(kq))) return false;

  const dd = tenTran(diaDanhTrongQuery(query));
  if (dd.length >= 4 && !/^\d+$/.test(dd) && !kq.includes(dd)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Vietmap: search (text -> ref_id) rồi place (ref_id -> lat/lng)
// Duyệt vài kết quả đầu thay vì lấy mỗi cái [0], để còn cơ hội gặp cái đúng tỉnh.
async function vietmap(query) {
  if (!VIETMAP_KEY) return null;
  const s = await fetchJSON(
    `https://maps.vietmap.vn/api/search/v3?apikey=${VIETMAP_KEY}&text=${encodeURIComponent(query)}`,
  );
  if (!Array.isArray(s)) return null;
  // ref_id mang mã loại: "vm:WARD:..." (phường/xã), "vm:DIST:..." (quận/huyện), "vmg:POI:..."
  // (cửa hàng, công ty, spa...). Ta luôn tra ĐƠN VỊ HÀNH CHÍNH nên phải loại POI và STREET,
  // không thì trúng cái tên na ná: "Thành phố Vũng Tàu, Hồ Chí Minh" từng ra một POI ở Quận 12
  // (lệch ~100km), "Xã Tân Vĩnh Hiệp" ra "Hội Người Mù ... Uyên Hưng".
  const laHanhChinh = (r) => !/^(POI|STREET)$/i.test((r.ref_id || "").split(":")[1] || "");
  for (const ung of s.filter(laHanhChinh).slice(0, 5)) {
    if (!ung?.ref_id) continue;
    if (!khopTinh(ung.display || ung.name || "", query)) continue;
    const p = await fetchJSON(
      `https://maps.vietmap.vn/api/place/v3?apikey=${VIETMAP_KEY}&refid=${encodeURIComponent(ung.ref_id)}`,
    );
    const lat = p?.lat ?? p?.latitude ?? p?.geometry?.location?.lat;
    const lng = p?.lng ?? p?.lon ?? p?.longitude ?? p?.geometry?.location?.lng;
    if (lat && lng && khopTinh(p?.display || ung.display || "", query)) {
      return { lat: +lat, lng: +lng, src: "vietmap" };
    }
  }
  return null;
}

// Nominatim (fallback) — cũng phải khớp tỉnh mới nhận
async function nominatim(query) {
  const j = await fetchJSON(
    `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=vn&q=${encodeURIComponent(query)}`,
    { "User-Agent": NOMINATIM_UA, "Accept-Language": "vi" },
  );
  if (!Array.isArray(j)) return null;
  for (const r of j) {
    if (khopTinh(r.display_name || "", query)) return { lat: +r.lat, lng: +r.lon, src: "osm" };
  }
  return null;
}

// ---------------------------------------------------------------------------
// SÁP NHẬP TỈNH 1/7/2025: bản đồ vẫn dùng ranh giới CŨ
//
// Bình Dương và Bà Rịa - Vũng Tàu đã nhập vào TP.HCM. Nguồn tin ghi theo tên MỚI, nhưng
// dữ liệu bản đồ (cả Vietmap lẫn Nominatim) phần lớn còn theo tên CŨ. Hậu quả đo được 19/8:
//   "Phường Tân Khánh, Hồ Chí Minh" -> 10.82, 106.64  (vùng Quận 12 — SAI)
//   "Phường Tân Khánh, Bình Dương"  -> 11.00, 106.72  (Tân Uyên — ĐÚNG)
// Phường Tân Khánh lập 1/7/2025 từ Thạnh Phước / Tân Phước Khánh / Tân Vĩnh Hiệp / Thạnh Hội
// (TP. Tân Uyên, Bình Dương cũ). Hỏi bằng tên tỉnh mới thì bản đồ không có, nó bèn chọn đại
// một chỗ khác cũng thuộc TP.HCM -> lệch ~30km mà vẫn "khớp tỉnh" nên lọt qua kiểm tra.
// => hỏi tên MỚI trước; không ra thì hỏi lại bằng từng tên tỉnh CŨ đã gộp vào.
const TINH_CU_GOP_VAO = { "Hồ Chí Minh": ["Bình Dương", "Bà Rịa - Vũng Tàu"] };

// API chính: thử Vietmap trước, không được thì Nominatim; cả hai đều thử tên tỉnh cũ nếu cần
export async function smartGeocode(query) {
  const thu = async (q) => (await vietmap(q)) || (await nominatim(q));
  const g = await thu(query);
  if (g) return g;

  const tinh = tinhTrongQuery(query);
  for (const cu of TINH_CU_GOP_VAO[tinh.trim()] || []) {
    const g2 = await thu(query.replace(tinh, cu));
    if (g2) return { ...g2, src: g2.src + "-tinh-cu" };
  }
  return null;
}

export const usingVietmap = !!VIETMAP_KEY;
