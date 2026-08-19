// Đọc TÊN ĐƯỜNG từ nội dung bài đăng, cho những nguồn không có sẵn trường địa chỉ
// (Facebook, chotot, mogi). Ghim theo đường sát hơn ghim theo phường/quận rất nhiều.
//
// Bài Facebook viết rất lộn xộn nên CHỈ nhận khi có MỐC rõ ràng đứng trước tên đường
// ("đường", "hẻm", "ngõ", "HXH", "mặt tiền", "số 12"). Đoán mò kiểu bắt mọi cụm viết hoa
// sẽ ra "Lotte Mart", "Cityland", "Sổ Hồng Riêng" — vừa sai vừa nhiều.
//
// An toàn kể cả khi đọc sai: geo.mjs bắt kết quả geocode phải khớp cả tên địa danh lẫn tỉnh,
// nên một tên đường bịa ra sẽ tra không thấy rồi tự lùi về phường/quận — chứ không ghim bậy.

const MOC = "(?:đường|đ/c|địa chỉ|mặt tiền|mt|mtkd|hẻm|hxh|ngõ|ngách|phố|toạ lạc|tọa lạc|nằm trên)";

// tên đường: 1-4 từ, mỗi từ bắt đầu bằng chữ HOA (hoặc là số như "Tỉnh lộ 10", "Số 51")
const TU = "[A-ZĐÀ-Ỹ][a-zà-ỹA-ZĐÀ-Ỹ.]*|\\d+[A-Za-z]?(?:/\\d+)?";
const RE_DUONG = new RegExp(`${MOC}\\s*(?:số\\s*)?((?:${TU})(?:\\s+(?:${TU})){0,3})`, "iu");

// "12 Nguyễn Trãi", "68 Đội Cấn" — số nhà đứng ngay trước tên đường
const RE_SO_NHA = new RegExp(`(?:^|[.,;\\n])\\s*(\\d{1,4}(?:/\\d{1,3})?)\\s+((?:${TU})(?:\\s+(?:${TU})){1,3})`, "u");

// những cụm KHÔNG phải tên đường tuy hay đứng sau mốc
const LOAI = /^(?:xe hơi|ô tô|oto|thông|rộng|lớn|nhỏ|cụt|nhựa|bê tông|trước nhà|kinh doanh|đẹp|vip|sạch|mới|chính chủ|sổ hồng|sổ đỏ|giá|dt|diện tích|ngang|dài|nhà|đất|căn|lô|nền|bán|cho thuê|cần|liên hệ|lh|chủ|em|anh|chị)\b/i;

const don = (s) => (s || "")
  .replace(/[.,;:!?)\]]+$/, "")
  .replace(/\s+/g, " ")
  .trim();

/** Trả về tên đường đọc được, hoặc null. */
export function docDuong(text) {
  const t = String(text || "").replace(/\s+/g, " ");
  if (!t) return null;

  for (const re of [RE_DUONG, RE_SO_NHA]) {
    const m = t.match(re);
    if (!m) continue;
    // RE_SO_NHA có 2 nhóm (số nhà + tên), RE_DUONG có 1
    const ten = don(m[2] ? `${m[1]} ${m[2]}` : m[1]);
    if (!ten || ten.length < 4 || ten.length > 60) continue;
    if (LOAI.test(ten)) continue;
    if (/^\d+$/.test(ten)) continue;              // toàn số -> không phải tên đường
    // có đơn vị đo lẫn vào -> là mô tả kích thước, không phải tên đường
    // ("4 TẦNG", "trước Nhà 3m thông", "lộ nhựa 220m MĐS")
    if (/\d\s*(?:m2|m²|m|tầng|lầu|tỷ|ty|triệu|tr|pn|wc|x\d)/iu.test(ten)) continue;
    if (/(?:tầng|lầu|phòng|wc|sổ|giá|hướng|ngang|dài|rộng|thông|thoáng|để|được|có|là|và)/iu.test(ten)) continue;
    // MỌI từ phải bắt đầu bằng chữ HOA (hoặc là số) — tên riêng viết hoa, còn chữ thường
    // lọt vào là câu văn chứ không phải tên đường ("hông tứ hướng th", "623 để được")
    if (!ten.split(/\s+/).every((w) => /^[A-ZĐÀ-Ỹ0-9]/u.test(w))) continue;
    if (!/[A-ZĐÀ-Ỹ]/u.test(ten)) continue;
    return ten;
  }
  return null;
}

/** Ghép địa chỉ đầy đủ nhất có thể để đem đi geocode. */
export function ghepDiaChi({ address, ward, district, province }, text) {
  const duong = address || docDuong(text);
  return [duong, ward, district, province].filter(Boolean).join(", ");
}
