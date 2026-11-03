// Che máy chủ đối tác trong URL ảnh/video rổ hàng (3/11, CLAUDE.md §4.1).
//
// Trước đây listings.images giữ nguyên URL gốc (firebasestorage .../hifriendz-agent..., media.evohome.it.com):
// lộ tên đối tác trong HTML công khai, API anon (REST đọc thẳng cột images) và khi khách mở ảnh ở tab mới.
// Giờ đổi sang https://nhadatradar.com/m/... - next.config.mjs (rewrites) chuyển tiếp về nguồn, cache CDN 1 năm.
// Hai bảng tiền tố dưới đây và rewrites trong next.config.mjs phải khớp nhau.

const RADAR = "https://nhadatradar.com/m";
const NGUON = [
  ["https://firebasestorage.googleapis.com/v0/b/hifriendz-agent.firebasestorage.app/o/listings%2Fuploads%2F", "/h/"],
  ["https://media.evohome.it.com/", "/e/"],
];

/** URL đối tác -> URL /m của Radar; URL khác (hoặc đã che) giữ nguyên */
export function cheMedia(u) {
  if (typeof u !== "string") return u;
  for (const [goc, ma] of NGUON) if (u.startsWith(goc)) return RADAR + ma + u.slice(goc.length);
  return u;
}

/** còn lộ máy chủ đối tác không - kiểm sau khi nhập / trong script đổi dữ liệu cũ */
export const conLoNguon = (u) => typeof u === "string" && /hifriendz|evohome/i.test(u);
