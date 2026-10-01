// TIỆN ÍCH cho bộ lọc tìm kiếm (1/10, theo hàng "Tiện ích" của EvoHome).
// Nguồn ghi tiện ích không đồng nhất: Chợ Tốt có mảng amenities (khoá ac/parking/...), rổ hàng EvoHome
// ghi trong mô tả ("• Máy lạnh", "• Máy giặt"...), tin FB/web khác chỉ có chữ trong mô tả.
// -> mỗi tiện ích khớp khi amenities chứa khoá cũ HOẶC mô tả/tiêu đề có một trong các cụm từ.
// Khớp chữ nên có thể lọt "không có thang máy" - chấp nhận, đổi lại không cần cột mới / migration.
export type TienIch = { k: string; ten: string; icon: string; am?: string; tu: string[] };

export const TIEN_ICH: TienIch[] = [
  { k: "dieu_hoa", ten: "Điều hòa", icon: "❄", am: "ac", tu: ["điều hòa", "điều hoà", "máy lạnh"] },
  { k: "nuoc_nong", ten: "Nước nóng", icon: "♨", tu: ["nước nóng", "nóng lạnh"] },
  { k: "tu_lanh", ten: "Tủ lạnh", icon: "🧊", tu: ["tủ lạnh"] },
  { k: "tivi", ten: "Tivi", icon: "📺", tu: ["tivi", "ti vi", "smart tv"] },
  { k: "may_giat", ten: "Máy giặt", icon: "🫧", tu: ["máy giặt"] },
  { k: "tu_quan_ao", ten: "Tủ quần áo", icon: "👕", tu: ["tủ quần áo", "tủ áo"] },
  { k: "giuong", ten: "Giường", icon: "🛏", tu: ["giường"] },
  { k: "ban_cong", ten: "Ban công", icon: "🌇", tu: ["ban công"] },
  { k: "thang_may", ten: "Thang máy", icon: "🛗", am: "elevator", tu: ["thang máy"] },
  { k: "de_xe", ten: "Để xe", icon: "🛵", am: "parking", tu: ["để xe", "giữ xe", "hầm xe"] },
  { k: "thu_cung", ten: "Thú cưng", icon: "🐾", am: "pet", tu: ["thú cưng", "nuôi chó", "nuôi mèo", "pet"] },
  { k: "san_phoi", ten: "Sân phơi", icon: "👚", tu: ["sân phơi", "chỗ phơi"] },
  { k: "gieng_troi", ten: "Giếng trời", icon: "☀", tu: ["giếng trời"] },
  { k: "xe_dien", ten: "Xe điện", icon: "🔌", tu: ["xe điện", "sạc xe"] },
  { k: "an_ninh", ten: "An ninh", icon: "🛡", am: "security", tu: ["an ninh", "camera", "bảo vệ", "vân tay"] },
  { k: "chu_chung", ten: "Chủ chung", icon: "👤", tu: ["chung chủ", "chủ chung"] },
  { k: "gac_lung", ten: "Gác lửng", icon: "🪜", tu: ["gác lửng", "gác xép", "có gác", "duplex"] },
  { k: "bon_rua", ten: "Bồn rửa chén", icon: "🚰", tu: ["bồn rửa", "chậu rửa"] },
  { k: "cua_so", ten: "Cửa sổ", icon: "🪟", tu: ["cửa sổ"] },
  { k: "ke_bep", ten: "Kệ bếp", icon: "🍳", tu: ["kệ bếp", "tủ bếp", "bếp riêng"] },
];

const THEO_KHOA = new Map(TIEN_ICH.map((t) => [t.k, t]));

/** "dieu_hoa,tu_lanh" -> các tiện ích hợp lệ (bỏ khoá lạ) */
export function docTienIch(s: string | null | undefined): TienIch[] {
  return [...new Set(String(s || "").split(","))].map((k) => THEO_KHOA.get(k.trim())).filter((t): t is TienIch => !!t);
}

/** chuỗi điều kiện .or() PostgREST cho 1 tiện ích (các cụm từ không chứa ký tự đặc biệt của .or) */
export function dieuKienTienIch(t: TienIch) {
  const dk = t.tu.flatMap((w) => [`description.ilike.%${w}%`, `title.ilike.%${w}%`]);
  dk.unshift(`amenities.cs.{${t.k}}`);   // rổ hàng lưu thẳng khoá này (evohome-fetch.mjs)
  if (t.am) dk.unshift(`amenities.cs.{${t.am}}`);
  return dk.join(",");
}

/** nhãn hiển thị cho khoá tiện ích kiểu mới ("dieu_hoa" -> "❄ Điều hòa"); khoá lạ -> null */
export const nhanTienIch = (k: string) => { const t = THEO_KHOA.get(k); return t ? `${t.icon} ${t.ten}` : null; };
