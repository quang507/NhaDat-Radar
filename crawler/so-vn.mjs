// Đọc SỐ viết theo kiểu Việt Nam. Một chỗ duy nhất cho mọi nguồn.
//
// Vì sao phải dùng chung: cùng một lỗi "bỏ mọi dấu chấm" đã phải vá RIÊNG LẺ ở extra-sites
// (16/8), mogi (16/8), guland (19/8) - và review /ultrareview vẫn tìm thấy batdongsan.mjs
// chưa vá, nơi "4.2 tỷ" ra 42 tỷ (lệch 10 lần) và "3.05 tỷ" ra 305 tỷ (lệch 100 lần).
// Chép tay lần thứ năm thì lần thứ sáu cũng sẽ sót; nên gom về đây.
//
// Quy tắc: dấu chấm CHỈ là ngăn-cách-nghìn khi đứng ngay trước ĐÚNG 3 chữ số và sau đó
// không còn chữ số nữa. Ngoài ra nó là dấu thập phân. Dấu phẩy luôn là thập phân.
//   "8.500.000.000" -> 8500000000   (ngăn nghìn)
//   "1.200"         -> 1200         (ngăn nghìn)
//   "4.2"           -> 4.2          (thập phân - 1 chữ số sau chấm)
//   "3.05"          -> 3.05         (thập phân - 2 chữ số)
//   "28,8"          -> 28.8         (phẩy thập phân)
export function soVN(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const n = parseFloat(s.replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
