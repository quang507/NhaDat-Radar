// Cổng chất lượng trước khi ĐĂNG (17/8) - bản TS cho webhook Zalo OA (src/app/api/zalo/webhook).
// SONG SONG với crawler/quality-gate.mjs (dùng cho facebook.mjs + zalo-bot.mjs) - sửa 1 nơi thì sửa nơi kia.
// Tin phải có (1) từ khoá BĐS, (2) số điện thoại, (3) khu vực.

// \b của JS chỉ hiểu ASCII -> "nhà", "giá" (có dấu) không khớp \b. Dùng (?<!\p{L}) / (?!\p{L}) + cờ u.
const B = "(?<!\\p{L})", E = "(?!\\p{L})";

export const BDS_KEYWORD = new RegExp([
  `${B}gi[áa]${E}`, `${B}nh[àa]${E}`, `${B}đ[ấa]t(?:\\s*n[ềe]n)?${E}`, "d[ựu]\\s*[áa]n", "b[ấa]t\\s*đ[ộo]ng\\s*s[ảa]n", `${B}bđs${E}`,
  "c[ăa]n\\s*h[ộo]", "m[ặa]t\\s*b[ằa]ng", "ph[òo]ng\\s*tr[ọo]", "chung\\s*c[ưu]", "bi[ệe]t\\s*th[ựu]", "shophouse",
  "nh[àa]\\s*ph[ốo]", "m[ặa]t\\s*ti[ềe]n", "s[ổo]\\s*(?:h[ồo]ng|đ[ỏo])",
].join("|"), "iu");

// (?<!\d) BẮT BUỘC - phải khớp y hệt crawler/quality-gate.mjs. Không có nó, regex khớp từ GIỮA
// một dãy số dài: "Số tài khoản 19001234567890" -> "01234567890". Ở đây hậu quả nặng hơn bên
// crawler vì hàm này chạy trên MỌI tin nhắn người dùng gửi vào Zalo OA (api/zalo/webhook/route.ts:47),
// tức cổng chất lượng cho tin do người thật đăng, không phải tin cào.
// tests/unit/crawler.spec.ts có ca so khớp hai bản - sửa lệch là test đỏ ngay.
export const PHONE_RE = /(?<!\d)(?:\+?84|0)(?:[\s.\-]?\d){9,10}(?!\d)/;

export const AREA_HINT = new RegExp([
  "qu[ậa]n", "huy[ệe]n", "ph[ưu][ờo]ng", `${B}x[ãa]${E}`, "th[àa]nh\\s*ph[ốo]", `${B}tp\\.?\\s*\\p{L}`, `t[ỉi]nh${E}`,
  `${B}q\\.?\\s*\\d{1,2}(?!\\d)`, `${B}p\\.?\\s*\\d{1,2}(?!\\d)`,
  "h[ồo]\\s*ch[íi]\\s*minh", `${B}hcm${E}`, "s[àa]i\\s*g[òo]n", "h[àa]\\s*n[ộo]i", "đ[àa]\\s*n[ẵa]ng", "b[ìi]nh\\s*d[ưu][ơo]ng",
  "đ[ồo]ng\\s*nai", "long\\s*an", "c[ầa]n\\s*th[ơo]", "v[ũu]ng\\s*t[àa]u", "nha\\s*trang", "h[ảa]i\\s*ph[òo]ng",
  "b[ìi]nh\\s*ch[áa]nh", "c[ủu]\\s*chi", "h[óo]c\\s*m[ôo]n", "th[ủu]\\s*đ[ứu]c", "g[òo]\\s*v[ấa]p", "t[âa]n\\s*b[ìi]nh",
  "t[âa]n\\s*ph[úu]", "b[ìi]nh\\s*t[âa]n", "b[ìi]nh\\s*th[ạa]nh", "ph[úu]\\s*nhu[ậa]n", "nh[àa]\\s*b[èe]", "qu[ậa]n\\s*\\d",
].join("|"), "iu");

/** null = đạt; chuỗi = lý do bị loại */
export function qualityGate(text: string, ai: { district?: string | null; province?: string | null } = {}): string | null {
  const t = text || "";
  if (!BDS_KEYWORD.test(t)) return "không có từ khoá BĐS";
  if (!PHONE_RE.test(t)) return "không có SĐT";
  if (!(ai.district || ai.province) && !AREA_HINT.test(t)) return "không có khu vực";
  return null;
}
