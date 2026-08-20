// Sáp nhập đơn vị hành chính 2025 - MỘT CHỖ DUY NHẤT giữ bảng ánh xạ tỉnh cũ -> tỉnh mới.
//
// Vì sao không ghi đè thẳng vào dữ liệu: thị trường vẫn nói "nhà Dĩ An Bình Dương",
// tin đăng ở nguồn vẫn ghi tỉnh cũ, và khách vẫn gõ "Bình Dương" khi tìm. Đổi hết
// province thành "Hồ Chí Minh" là làm mất khả năng tìm theo tên cũ - mà tên cũ mới là
// thứ người ta dùng. Nên: GIỮ NGUYÊN dữ liệu nguồn, chỉ dùng bảng này để gắn nhãn và
// để gộp khi cần thống kê.
//
// Lưu ý phân biệt hai loại, đừng lẫn:
//   - Tỉnh bị sáp nhập vào tỉnh khác  -> bảng SAP_NHAP_TINH dưới đây.
//   - Đơn vị CẤP HUYỆN mang chữ "Thành phố" (TP. Dĩ An, TP. Thuận An, TP. Thủ Dầu Một,
//     TP. Thủ Đức) -> vẫn là quận/huyện hợp lệ, KHÔNG được coi là tỉnh và không được xoá.
//     (17/8: hậu kiểm của tôi từng báo nhầm 10 bản ghi loại này là "rác".)

export const SAP_NHAP_TINH: Record<string, string> = {
  "Bình Dương": "Hồ Chí Minh",
  "Bà Rịa - Vũng Tàu": "Hồ Chí Minh",
  "Bà Rịa-Vũng Tàu": "Hồ Chí Minh",
  "Ba Ria - Vung Tau": "Hồ Chí Minh",
};

/** Tỉnh này đã sáp nhập vào đâu? null nếu chưa sáp nhập. */
export function tinhMoi(tinh: string | null | undefined): string | null {
  return tinh ? SAP_NHAP_TINH[tinh.trim()] ?? null : null;
}

/** Tên hiển thị kèm chú thích sáp nhập: "Bình Dương (nay thuộc Hồ Chí Minh)" */
export function nhanTinh(tinh: string | null | undefined): string {
  const t = (tinh || "").trim();
  const moi = tinhMoi(t);
  return moi ? `${t} (nay thuộc ${moi})` : t;
}

/** Gộp về tỉnh hiện hành để đếm/thống kê (không dùng để ghi vào DB). */
export function gopTinh(tinh: string | null | undefined): string | null {
  const t = (tinh || "").trim();
  return t ? SAP_NHAP_TINH[t] ?? t : null;
}

/**
 * Tra NGƯỢC: tỉnh hiện hành này gồm những tỉnh cũ nào?
 *   tinhCuGopVao("Hồ Chí Minh") -> ["Bình Dương", "Bà Rịa - Vũng Tàu", ...]
 * Dùng khi công tắc "Địa chỉ mới sau sáp nhập" BẬT: lọc "Hồ Chí Minh" thì phải trả về
 * cả tin còn ghi tên tỉnh cũ, vì nguồn chưa cập nhật theo địa giới mới.
 * Trả mảng rỗng nếu tỉnh không nhận sáp nhập từ đâu cả.
 */
export function tinhCuGopVao(tinhHienHanh: string | null | undefined): string[] {
  const t = (tinhHienHanh || "").trim();
  if (!t) return [];
  return [...new Set(Object.entries(SAP_NHAP_TINH).filter(([, moi]) => moi === t).map(([cu]) => cu))];
}
