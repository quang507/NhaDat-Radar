// URL ảnh/video rổ hàng (3/11 -> 5/11).
//
// 3/11: đổi URL đối tác sang https://nhadatradar.com/m/... để che máy chủ đối tác; Vercel chuyển tiếp ảnh/video
// và cắt logo ảnh HiFriendz. ~100.000 ảnh + ~3.500 video 6-9MB đi qua Vercel, mỗi deploy kéo lại -> vượt Fast Origin
// Transfer gói Hobby, Vercel khoá tài khoản (4/11).
// 5/11: anh Quang chấp nhận lộ nguồn ảnh -> listings.images giữ URL GỐC của đối tác, trình duyệt tải thẳng từ nguồn,
// Vercel không tốn byte nào. URL /m cũ (HTML còn cache, Google Images, link đã share) được next.config.mjs redirect
// về nguồn - bảng tiền tố dưới đây và redirect đó phải khớp (tests/unit/che-media.spec.ts kiểm).

export const MEDIA_CU = "https://nhadatradar.com/m";
export const NGUON = [
  ["https://firebasestorage.googleapis.com/v0/b/hifriendz-agent.firebasestorage.app/o/listings%2Fuploads%2F", "/h/"],
  ["https://media.evohome.it.com/", "/e/"],
];

/** URL /m cũ -> URL gốc của đối tác; URL khác giữ nguyên */
export function veGoc(u) {
  if (typeof u !== "string") return u;
  for (const [nguon, ma] of NGUON) if (u.startsWith(MEDIA_CU + ma)) return nguon + u.slice((MEDIA_CU + ma).length);
  return u;
}
