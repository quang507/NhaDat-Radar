// Cổng chất lượng trước khi ĐĂNG (17/8) - dùng chung cho tin Facebook (facebook.mjs) và Zalo (zalo-bot.mjs).
// Bỏ duyệt tay nên phải chặn máy: tin phải có (1) từ khoá BĐS, (2) số điện thoại, (3) khu vực.
// Bản TS song song cho webhook Zalo OA ở src/lib/quality-gate.ts - sửa 1 nơi thì sửa nơi kia.

// LƯU Ý: \b của JS chỉ hiểu ASCII -> "nhà", "giá" (có dấu) không khớp \b. Dùng (?<!\p{L}) / (?!\p{L}) + cờ u.
// EXPORT: review /ultrareview - hai hang nay da ton tai va duoc doc-dia-chi.mjs goi ten trong
// chu thich, nhung KHONG export, nen moi noi can bien lai chep tay literal. Chinh viec chep tay
// do la cach 5 byte BACKSPACE (0x08) lot vao regex va song sot tron mot commit (4dade2d).
export const B = "(?<!\\p{L})", E = "(?!\\p{L})"; // đầu/cuối từ, hiểu Unicode
/** Boc cac tu khoa bang bien Unicode - dung thay cho viec tu noi chuoi o tung file. */
export const tuKhoa = (...tu) => new RegExp(`${B}(?:${tu.join("|")})${E}`, "iu");

// (1) Từ khoá BĐS: giá / nhà / đất (nền) / dự án / bất động sản / căn hộ / mặt bằng + vài từ hay gặp
export const BDS_KEYWORD = new RegExp([
  `${B}gi[áa]${E}`, `${B}nh[àa]${E}`, `${B}đ[ấa]t(?:\\s*n[ềe]n)?${E}`, "d[ựu]\\s*[áa]n", "b[ấa]t\\s*đ[ộo]ng\\s*s[ảa]n", `${B}bđs${E}`,
  "c[ăa]n\\s*h[ộo]", "m[ặa]t\\s*b[ằa]ng", "ph[òo]ng\\s*tr[ọo]", "chung\\s*c[ưu]", "bi[ệe]t\\s*th[ựu]", "shophouse",
  "nh[àa]\\s*ph[ốo]", "m[ặa]t\\s*ti[ềe]n", "s[ổo]\\s*(?:h[ồo]ng|đ[ỏo])",
].join("|"), "iu");

// (2) SĐT Việt Nam: 0xxxxxxxxx / +84 / 84, cho phép cách bằng . - khoảng trắng
// (?<!\d) BAT BUOC: review /ultrareview - khong co no, regex khop tu GIUA mot day so dai.
//   "So tai khoan 19001234567890" -> khop "01234567890" (bat dau tu giua day)
// So sai chay tiep vao phone_hash, ma hash do la khoa dedupe lien nguon (merge.mjs), la
// poster_key gom "N tin khac cua nguoi dang", va la don vi dem "nguoi dang rieng biet" cua
// cum so gia -> mot so tai khoan ngan hang dung chung se gop nhieu tin thanh cung mot nguoi.
export const PHONE_RE = /(?<!\d)(?:\+?84|0)(?:[\s.\-]?\d){9,10}(?!\d)/;

// (3) Khu vực: quận/huyện/phường/xã/TP/tỉnh, "Q7" "P5", hoặc tên tỉnh-thành / quận lớn
export const AREA_HINT = new RegExp([
  "qu[ậa]n", "huy[ệe]n", "ph[ưu][ờo]ng", `${B}x[ãa]${E}`, "th[àa]nh\\s*ph[ốo]", `${B}tp\\.?\\s*\\p{L}`, `t[ỉi]nh${E}`,
  `${B}q\\.?\\s*\\d{1,2}(?!\\d)`, `${B}p\\.?\\s*\\d{1,2}(?!\\d)`,
  "h[ồo]\\s*ch[íi]\\s*minh", `${B}hcm${E}`, "s[àa]i\\s*g[òo]n", "h[àa]\\s*n[ộo]i", "đ[àa]\\s*n[ẵa]ng", "b[ìi]nh\\s*d[ưu][ơo]ng",
  "đ[ồo]ng\\s*nai", "long\\s*an", "c[ầa]n\\s*th[ơo]", "v[ũu]ng\\s*t[àa]u", "nha\\s*trang", "h[ảa]i\\s*ph[òo]ng",
  "b[ìi]nh\\s*ch[áa]nh", "c[ủu]\\s*chi", "h[óo]c\\s*m[ôo]n", "th[ủu]\\s*đ[ứu]c", "g[òo]\\s*v[ấa]p", "t[âa]n\\s*b[ìi]nh",
  "t[âa]n\\s*ph[úu]", "b[ìi]nh\\s*t[âa]n", "b[ìi]nh\\s*th[ạa]nh", "ph[úu]\\s*nhu[ậa]n", "nh[àa]\\s*b[èe]", "qu[ậa]n\\s*\\d",
].join("|"), "iu");

/**
 * @param {string} text  nội dung tin (đã làm sạch)
 * @param {{district?: string|null, province?: string|null}} ai  khu vực AI trích được (nếu có thì khỏi dò text)
 * @returns {null | string}  null = đạt; chuỗi = lý do bị loại
 */
export function qualityGate(text, ai = {}) {
  const t = text || "";
  if (!BDS_KEYWORD.test(t)) return "không có từ khoá BĐS";
  if (!PHONE_RE.test(t)) return "không có SĐT";
  if (!(ai.district || ai.province) && !AREA_HINT.test(t)) return "không có khu vực";
  return null;
}
