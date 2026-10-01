// RỔ HÀNG RADAR (28/9): hàng Radar trực tiếp nắm - EvoHome/HiFriendz (phòng cho thuê), Thiên Khôi
// (nhà phố bán). Nhập bằng crawler/ro-hang-*.mjs với source='ro_hang'; địa chỉ đã che số nhà,
// toạ độ đã lệch ~20-35 m ngay từ lúc nhập (bản thật ở bảng listing_ro_hang, chỉ admin đọc).
//
// Quy tắc bán hàng trên web:
//   - không lộ tên đối tác / link gốc: hiển thị "Rổ hàng Radar"
//   - CTA duy nhất: gọi hotline · nhắn Zalo hẹn xem · đặt lịch xem
//   - không ghi hợp đồng, không nhận bớt giá qua tin nhắn -> mời qua xem rồi thương lượng
//   - cuối tháng: tag giữ phòng sang đầu tháng sau
export const DOI_TAC_RO_HANG = ["evohome", "thienkhoi"];

export function laRoHang(x: { source?: string | null; source_site?: string | null }) {
  return x.source === "ro_hang" || DOI_TAC_RO_HANG.includes(x.source_site || "");
}

export const NHAN_RO_HANG = "Rổ hàng Radar";

/** Tên nguồn để HIỂN THỊ - rổ hàng không bao giờ lộ tên đối tác */
export function tenNguon(x: { source?: string | null; source_site?: string | null }) {
  if (laRoHang(x)) return NHAN_RO_HANG;
  if (x.source === "agent") return "Tự đăng";
  return x.source_site || "crawl";
}

/** Từ ngày 20 trở đi khách thuê bắt đầu tìm phòng cho tháng sau -> gắn tag giữ phòng */
export function tagGiuPhong(x: { deal?: string | null; source?: string | null; source_site?: string | null }, now = new Date()) {
  if (!laRoHang(x) || x.deal !== "cho_thue") return null;
  const ngay = Number(now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh", day: "numeric" }));
  return ngay >= 20 ? "🔥 Hỗ trợ giữ phòng từ hôm nay sang đầu tháng sau nhận phòng!" : null;
}

/**
 * Mã phòng cho khách nhắn Zalo (29/9): link zalo.me không điền sẵn được tin nhắn -> khách gửi mã
 * để biết đang hỏi phòng nào trong ~1.400 phòng. Lấy 6 ký tự đầu của id (uuid) nên không cần cột mới;
 * trùng hiếm (~6% có 1 cặp trùng trên 1.400 tin) -> ô tra mã ở admin hiện đủ các tin khớp.
 */
export function maPhong(id: string) {
  return "RH" + id.replace(/-/g, "").slice(0, 6).toUpperCase();
}

/** "rh1a2b3c" / "1A2B3C" -> khoảng id [gte, lte] để lọc cột uuid; null nếu không phải mã hợp lệ */
export function khoangIdTuMa(ma: string): [string, string] | null {
  const p = ma.trim().toLowerCase().replace(/^rh/, "");
  if (!/^[0-9a-f]{6}$/.test(p)) return null;
  return [`${p}00-0000-0000-0000-000000000000`, `${p}ff-ffff-ffff-ffff-ffffffffffff`];
}

/** Câu chốt khi khách hỏi giá / bớt / hợp đồng một tin rổ hàng (web + chatbot dùng chung) */
export function cauChotXemPhong(giaHienThi: string) {
  return `Dạ phòng giá niêm yết ${giaHienThi}, nhưng anh/chị cứ qua xem phòng thực tế ưng ý thì em sẽ trực tiếp hỗ trợ thương lượng giá và hợp đồng tốt nhất với chủ nhà cho mình nhé! Anh/chị ghé xem được sáng hay chiều nay ạ?`;
}

/**
 * Trộn rổ hàng vào danh sách thường theo tỉ lệ `moiNhom` tin rổ hàng : 1 tin khác.
 * Rổ hàng được ưu tiên nhưng tin crawl vẫn xuất hiện đều (không bị đẩy hết xuống cuối).
 * Hết một bên thì bên còn lại nối tiếp.
 */
export function tronRoHang<T extends { id: string }>(roHang: T[], khac: T[], moiNhom = 2): T[] {
  const out: T[] = [], seen = new Set<string>();
  let i = 0, j = 0;
  const day = (x: T) => { if (!seen.has(x.id)) { seen.add(x.id); out.push(x); } };
  while (i < roHang.length || j < khac.length) {
    for (let k = 0; k < moiNhom && i < roHang.length; k++) day(roHang[i++]);
    if (j < khac.length) day(khac[j++]);
  }
  return out;
}

/**
 * Link mở phòng gốc trên app EvoHome (1/10, chỉ admin thấy ở trang chi tiết tin).
 * Mẫu lấy từ URL thật khi bấm 1 phòng trên EvoHome: trang danh sách + "&sheet=transaction-unit:<id>:detail"
 * mở bảng chi tiết phòng bên phải (<id> = id phòng EvoHome = source_post_id). Cần đăng nhập EvoHome.
 * EVOHOME_UNIT_URL (có "{id}") để đổi mẫu nếu EvoHome đổi đường dẫn.
 */
const DS_PHONG_EVOHOME = "https://app.evohome.it.com/re-selling-dashboard/real-estate/transaction-units?adminMode=old&status=VACANT&type=ROOM&view=all";
export function linkGocEvohome(sourcePostId: string | null | undefined) {
  if (!sourcePostId) return DS_PHONG_EVOHOME;
  const mau = process.env.EVOHOME_UNIT_URL || `${DS_PHONG_EVOHOME}&sheet=transaction-unit%3A{id}%3Adetail`;
  return mau.replace("{id}", encodeURIComponent(sourcePostId));
}

/**
 * Phân trang THẬT cho danh sách trộn (1/10): cùng nhịp với tronRoHang (moiNhom rổ hàng : 1 tin khác,
 * hết một bên thì bên kia nối tiếp) nhưng chỉ tính VỊ TRÍ, không cần tải cả danh sách. Cho biết trang
 * [tu, tu+so) cần lấy đoạn nào của mỗi bên và xếp xen theo thứ tự nào -> mỗi trang chỉ tải đúng ~20 tin.
 * R / K = tổng số tin rổ hàng / tin khác khớp bộ lọc.
 */
export function oTronRoHang(R: number, K: number, tu: number, so: number, moiNhom = 2) {
  const thuTu: ("r" | "k")[] = [];
  let i = 0, j = 0, rhTu = -1, khacTu = -1, viTri = 0;
  const het = tu + so;
  const dat = (b: "r" | "k") => {
    if (viTri >= tu && viTri < het) {
      thuTu.push(b);
      if (b === "r" && rhTu < 0) rhTu = i - 1;
      if (b === "k" && khacTu < 0) khacTu = j - 1;
    }
    viTri++;
  };
  while ((i < R || j < K) && viTri < het) {
    for (let k = 0; k < moiNhom && i < R && viTri < het; k++) { i++; dat("r"); }
    if (j < K && viTri < het) { j++; dat("k"); }
  }
  const rhSo = thuTu.filter((b) => b === "r").length, khacSo = thuTu.length - rhSo;
  return { rhTu: Math.max(rhTu, 0), rhSo, khacTu: Math.max(khacTu, 0), khacSo, thuTu };
}

/** Ghép 2 đoạn đã tải theo thứ tự oTronRoHang trả về */
export function xepTheoThuTu<T>(thuTu: ("r" | "k")[], rh: T[], khac: T[]): T[] {
  let i = 0, j = 0;
  const out: T[] = [];
  for (const b of thuTu) {
    const x = b === "r" ? rh[i++] : khac[j++];
    if (x !== undefined) out.push(x);
  }
  return out;
}
