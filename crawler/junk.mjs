// Bộ lọc tin rác dùng chung cho pipeline crawl.
// Nguyên tắc chọn từ khóa: chỉ những cụm GẦN NHƯ KHÔNG BAO GIỜ xuất hiện trong tin BĐS thật
// (tránh "ô tô" - dính "hẻm ô tô", "điều hòa"/"nội thất" - dính mô tả nhà).
export const JUNK_PATTERNS = [
  // thiết bị điện / xây dựng bán lẻ
  /đèn (đường|led|năng lượng|pha|trụ)/i, /công tắc/i, /ổ cắm/i,
  /thiết bị (điện|vệ sinh|nhà bếp|an ninh)/i, /máy bơm/i, /dây cáp/i,
  // dịch vụ thi công / quảng cáo dịch vụ
  /báo giá/i, /(nhận|chuyên|dịch vụ) (thi công|lắp đặt|sửa chữa|sơn)/i, /thi công trọn gói/i,
  /khoan (giếng|cắt)/i, /hút hầm/i, /thông (cống|tắc)/i, /diệt (mối|côn trùng|chuột)/i,
  /chuyển (nhà|văn phòng) trọn gói/i, /taxi tải/i, /vệ sinh công nghiệp/i,
  // tuyển dụng / việc làm
  /tuyển (dụng|nhân viên|gấp|ctv|cộng tác)/i, /cần tuyển/i, /việc làm/i, /tìm việc/i,
  // tài chính / vay
  /cho vay/i, /vay (vốn|tiền|nhanh|online)/i, /giải ngân/i, /đáo hạn/i,
  /hỗ trợ tài chính/i, /bảo hiểm (nhân thọ|xe|sức khỏe)/i,
  // hàng tiêu dùng không phải BĐS
  /sim số/i, /iphone/i, /macbook/i, /laptop/i, /máy giặt/i, /tủ lạnh/i,
  /máy lọc nước/i, /camera (wifi|hành trình)/i, /mỹ phẩm/i, /nước hoa/i,
  /quần áo/i, /giày dép/i, /thực phẩm chức năng/i, /thanh lý (bàn ghế|đồ|kệ)/i,
];

export function isJunk(title = "", description = "") {
  const t = String(title);
  if (t.trim().length < 8) return true; // tiêu đề quá ngắn = rác
  const text = t + " " + String(description).slice(0, 300);
  return JUNK_PATTERNS.some((re) => re.test(text));
}
