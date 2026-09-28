// RỔ HÀNG RADAR (28/9): hàng Radar trực tiếp nắm - EvoHome/HiFriendz (phòng cho thuê), Thiên Khôi
// (nhà phố bán). Nhập bằng crawler/ro-hang-*.mjs với source='ro_hang'; địa chỉ đã che số nhà,
// toạ độ đã lệch ~60 m ngay từ lúc nhập (bản thật ở bảng listing_ro_hang, chỉ admin đọc).
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
