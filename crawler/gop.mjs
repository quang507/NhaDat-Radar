// Hàm thuần cho bước gộp trùng (merge.mjs) và ghi toạ độ (daily.mjs) - tách riêng để unit test được
// (merge.mjs / daily.mjs chạy cả pipeline ngay khi import).

const rong = (v) => v == null || v === "" || (Array.isArray(v) && v.length === 0);

// Gộp bản trùng x vào bản giữ lại dup THEO TỪNG TRƯỜNG (audit 22/9). Bản cũ Object.assign(dup, x)
// khi x "giàu" hơn -> đè TOÀN BỘ: mất toạ độ thật / phường / SĐT che của dup, và lấy giá của nguồn
// khác gắn dưới source_url của dup (web hiện 5,25 tỷ, bấm "xem bài gốc" ra tin 5,2 tỷ).
// Quy tắc:
//  - danh tính + tiêu đề + giá + diện tích: của dup (phải khớp bài gốc được link); chỉ bù khi dup THIẾU
//  - toạ độ: giữ bản chính xác hơn (xem HANG_TOA_DO)
//  - chi tiết rời (phường, địa chỉ, SĐT che, phòng, pháp lý...): giữ dup, bù khi thiếu
//  - mô tả: bản dài hơn; ảnh + tiện ích: hợp (dup trước); posted_at: sớm nhất
const BU_KHI_THIEU = ["title", "price_vnd", "area_m2", "district", "ward", "address", "province", "phone_masked", "phone_hash",
  "bedrooms", "bathrooms", "floors", "direction", "legal", "furnishing", "specs", "poster_id"];
export function gopTrung(dup, x) {
  for (const k of BU_KHI_THIEU) if (rong(dup[k]) && !rong(x[k])) dup[k] = x[k];
  if (dup.price_vnd && dup.area_m2) dup.price_per_m2 = Math.round(dup.price_vnd / dup.area_m2);
  if (x.lat != null && x.lng != null && hangToaDo(x.geo_precision) > hangToaDo(dup.lat != null && dup.lng != null ? dup.geo_precision : "khong")) {
    dup.lat = x.lat; dup.lng = x.lng; dup.geo_precision = x.geo_precision ?? null;
  }
  if ((x.description || "").length > (dup.description || "").length) dup.description = x.description;
  dup.images = [...new Set([...(dup.images || []), ...(x.images || [])])].slice(0, 12);
  dup.amenities = [...new Set([...(dup.amenities || []), ...(x.amenities || [])])];
  if (x.posted_at && (!dup.posted_at || x.posted_at < dup.posted_at)) dup.posted_at = x.posted_at;
  return dup;
}

// Độ chính xác toạ độ (cột listings.geo_precision, migration 029):
//   nguon  = toạ độ do trang nguồn cung cấp (chotot API, trang chi tiết batdongsan)
//   duong  = geocode theo tên đường (Nominatim)
//   phuong = geocode theo phường + rải ngẫu nhiên ±0.0015°
//   quan   = geocode theo quận  + rải ngẫu nhiên ±0.008° (sai 1-5 km, đo 22/9)
// null (hàng cũ trước 029) = không rõ -> xếp NGAY DƯỚI "nguon": chỉ toạ độ nguồn mới được đè, để
// không đè mất toạ độ thật đã lưu từ trước bằng một điểm geocode rải ngẫu nhiên.
export const HANG_TOA_DO = { khong: 0, quan: 1, phuong: 2, duong: 3, null: 3.5, nguon: 4 };
export const hangToaDo = (p) => HANG_TOA_DO[p ?? "null"] ?? 0;

// Toạ độ ghi xuống DB cho 1 tin đã có trong DB. moi/cu = { lat, lng, geo_precision }.
// Toạ độ mới chỉ thắng khi CHÍNH XÁC BẰNG hoặc HƠN toạ độ đang lưu (bản cũ: cứ khác rỗng là đè ->
// toạ độ thật của trang chi tiết batdongsan bị điểm rải theo phường/quận ghi đè ở lượt cào sau).
export function chonToaDo(moi, cu) {
  const coMoi = moi && moi.lat != null && moi.lng != null;
  const coCu = cu && cu.lat != null && cu.lng != null;
  if (!coMoi) return coCu ? { lat: cu.lat, lng: cu.lng, geo_precision: cu.geo_precision ?? null } : { lat: null, lng: null, geo_precision: null };
  if (!coCu) return { lat: moi.lat, lng: moi.lng, geo_precision: moi.geo_precision ?? null };
  return hangToaDo(moi.geo_precision) >= hangToaDo(cu.geo_precision)
    ? { lat: moi.lat, lng: moi.lng, geo_precision: moi.geo_precision ?? null }
    : { lat: cu.lat, lng: cu.lng, geo_precision: cu.geo_precision ?? null };
}

// ---- Cờ giá lệch (merge.mjs) ----
// Bản cũ: ngưỡng CỨNG ±28% quanh trung vị cụm (tỉnh|quận|loại|bán/thuê). Đo trên 515 tin thật
// (22/9): 22% tổng số tin bị gắn cờ, riêng bán nhà phố 30% (trung vị độ lệch 48%) - giá nhà phố
// vốn tản rộng theo vị trí/diện tích đất nên "lệch 28%" là chuyện thường -> cảnh báo mất giá trị
// và còn trừ 12 điểm ai_score.
// Bản mới: hàng rào IQR của CHÍNH cụm đó (Tukey) + vẫn phải lệch ≥35% so với trung vị, cụm phải
// đủ lớn. Cụm càng tản thì hàng rào càng rộng -> chỉ còn giá thực sự dị thường bị gắn cờ.
export const CUM_TOI_THIEU = 8, NGUOI_DANG_TOI_THIEU = 3, LECH_TOI_THIEU = 0.35;
export function phanVi(vals, p) {
  const s = [...vals].sort((a, b) => a - b);
  if (!s.length) return null;
  const i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i);
  return lo === hi ? s[lo] : s[lo] + (s[hi] - s[lo]) * (i - lo);
}
// Hàng rào tính trên THANG LOG: giá BĐS lệch phải (log-normal), làm trên thang thường thì hàng rào
// dưới ra số ÂM -> không bao giờ gắn cờ được tin "rẻ bất thường" (đúng loại tin cần cảnh báo nhất:
// giá mồi, ghi thiếu số 0). Trên thang log, hàng rào thành hệ số nhân đối xứng quanh trung vị.
export function nguongGiaLech(vals) {
  const duong = vals.filter((v) => v > 0);
  if (duong.length < CUM_TOI_THIEU) return null;
  const ln = duong.map(Math.log);
  const q25 = phanVi(ln, 0.25), q50 = phanVi(ln, 0.5), q75 = phanVi(ln, 0.75);
  const iqr = q75 - q25;
  return { p25: Math.exp(q25), p50: Math.exp(q50), p75: Math.exp(q75), thap: Math.exp(q25 - 1.5 * iqr), cao: Math.exp(q75 + 1.5 * iqr) };
}
// null = không gắn cờ; {reason, deviation_pct} = có cờ
export function coLech(v, ng) {
  if (!ng || !ng.p50) return null;
  const dev = (v - ng.p50) / ng.p50;
  if (Math.abs(dev) < LECH_TOI_THIEU) return null;
  if (v >= ng.thap && v <= ng.cao) return null;   // vẫn nằm trong hàng rào IQR của cụm
  return { reason: dev > 0 ? "cao_hon" : "thap_hon", deviation_pct: Math.round(dev * 100) };
}
