// Bộ lọc tin rác dùng chung cho pipeline crawl.
// Nguyên tắc chọn từ khóa: chỉ những cụm GẦN NHƯ KHÔNG BAO GIỜ xuất hiện trong tin BĐS thật
// (tránh "ô tô" - dính "hẻm ô tô", "điều hòa"/"nội thất" - dính mô tả nhà).
//
// Audit 22/9: "máy giặt", "tủ lạnh", "tủ quần áo" là TIỆN NGHI tiêu chuẩn của phòng/căn hộ cho
// thuê -> bộ lọc cũ loại 51/300 tin chotot (17%, toàn tin cho thuê thật). Tách 2 nhóm:
//   RAC_CUNG: luôn là rác (tuyển dụng, dịch vụ thi công...) - tin rao nhà không dùng các cụm này.
//   RAC_MEM : đồ gia dụng / thiết bị / vay vốn - chỉ là rác khi tin KHÔNG có tín hiệu BĐS rõ
//             ("cho thuê", "căn hộ", "2PN", "bán nhà", "sổ hồng", "60m2"...). Tin bán nhà hay ghi
//             "hỗ trợ vay ngân hàng 70%" nên nhóm vay cũng phải nằm ở đây.
export const RAC_CUNG = [
  // dịch vụ thi công / quảng cáo dịch vụ
  /(nhận|chuyên|dịch vụ) (thi công|lắp đặt|sửa chữa|sơn)/i, /thi công trọn gói/i,
  /khoan (giếng|cắt)/i, /hút hầm/i, /thông (cống|tắc)/i, /diệt (mối|côn trùng|chuột)/i,
  /chuyển (nhà|văn phòng) trọn gói/i, /taxi tải/i, /vệ sinh công nghiệp/i,
  // tuyển dụng / việc làm
  /tuyển (dụng|nhân viên|gấp|ctv|cộng tác)/i, /cần tuyển/i, /việc làm/i, /tìm việc/i,
  // bảo hiểm
  /bảo hiểm (nhân thọ|xe|sức khỏe)/i,
];
export const RAC_MEM = [
  // thiết bị điện / xây dựng bán lẻ
  /đèn (đường|led|năng lượng|pha|trụ)/i, /công tắc/i, /ổ cắm/i,
  /thiết bị (điện|vệ sinh|nhà bếp|an ninh)/i, /máy bơm/i, /dây cáp/i, /báo giá/i,
  // tài chính / vay
  /cho vay/i, /vay (vốn|tiền|nhanh|online)/i, /giải ngân/i, /đáo hạn/i, /hỗ trợ tài chính/i,
  // hàng tiêu dùng không phải BĐS
  /sim số/i, /iphone/i, /macbook/i, /laptop/i, /máy giặt/i, /tủ lạnh/i,
  /máy lọc nước/i, /camera (wifi|hành trình)/i, /mỹ phẩm/i, /nước hoa/i,
  /quần áo/i, /giày dép/i, /thực phẩm chức năng/i, /thanh lý (bàn ghế|đồ|kệ)/i,
];
// Giữ tên cũ cho code/test đang import
export const JUNK_PATTERNS = [...RAC_CUNG, ...RAC_MEM];

// Tín hiệu BĐS RÕ (hẹp hơn BDS_KEYWORD của quality-gate - cái đó có cả "giá"/"nhà" nên
// "thanh lý tủ lạnh giá rẻ" cũng khớp).
// Lượt 2 (dữ liệu thật): còn sót "Duplex", "CHDV", "Phòng mới xây", "Pass trọ" -> thêm phòng/trọ/duplex/
// chdv/gác lửng/ký túc xá.
export const TIN_HIEU_BDS = /cho\s*thu[êe]|c[ăa]n\s*h[ộo]|(?<!\p{L})ph[òo]ng(?!\p{L})|(?<!\p{L})tr[ọo](?!\p{L})|chung\s*c[ưu]|studio|duplex|(?<!\p{L})chdv(?!\p{L})|g[áa]c\s*l[ửu]ng|k[ýy]\s*t[úu]c\s*x[áa]|m[ặa]t\s*b[ằa]ng|nh[àa]\s*(nguy[êe]n\s*c[ăa]n|ph[ốo]|m[ặa]t\s*ti[ềe]n)|\d+\s*pn\b|b[áa]n\s*(g[ấa]p\s*)?(nh[àa]|đ[ấa]t|c[ăa]n|l[ôo])|s[ổo]\s*(h[ồo]ng|đ[ỏo])|\d+(?:[.,]\d+)?\s*m(?:2|²)/iu;
// Loại BĐS do NGUỒN phân (chotot theo danh mục, mogi theo URL, facebook sau khi model xác nhận
// is_property) là tín hiệu mạnh hơn mọi từ khoá - "khac" thì không tính.
const LOAI_BDS = new Set(["phong_tro", "can_ho", "nha", "dat", "mat_bang"]);

export function isJunk(title = "", description = "", loai = null) {
  const t = String(title);
  if (t.trim().length < 8) return true; // tiêu đề quá ngắn = rác
  const text = t + " " + String(description).slice(0, 300);
  if (RAC_CUNG.some((re) => re.test(text))) return true;
  if (!RAC_MEM.some((re) => re.test(text))) return false;
  return !(LOAI_BDS.has(loai) || TIN_HIEU_BDS.test(text));
}
