// Nâng ảnh crawl lên bản phân giải cao (nguồn lưu thumbnail nhỏ -> đổi URL sang bản lớn).
export function hiRes(u: string): string {
  if (!u) return u;
  // Mogi: thumb-small (mờ) -> bản gốc
  if (u.includes("cloud.mogi.vn/images/thumb-small/")) {
    return u.replace("/images/thumb-small/", "/images/");
  }
  // Batdongsan: crop nhỏ (283x141, 562x284...) -> resize lớn
  const bds = u.match(/^(https:\/\/file\d*\.batdongsan\.com\.vn)\/crop\/\d+x\d+\/(.+)$/);
  if (bds) return `${bds[1]}/resize/1275x717/${bds[2]}`;
  return u;
}

// Lọc mảng ảnh: bỏ link không phải ảnh (album facebook...), object rác.
// video lẫn trong danh sách ảnh nguồn (EvoHome .mp4/.mov, 30/9) -> <img> vỡ; bộ lọc chính ở crawler/chung.mjs laAnh()
const LA_VIDEO = /\.(mp4|mov|m4v|webm|avi|3gp|mkv)$/i;

/** video lẫn trong images (rổ hàng EvoHome) - trang chi tiết tách ra để phát bằng <video> */
export function layVideo(images: unknown[] | null | undefined): string[] {
  return (images || []).filter((u): u is string => typeof u === "string" && /^https?:\/\//.test(u) && LA_VIDEO.test(u.split(/[?#]/)[0]));
}
/** số ẢNH (không tính video) - nhãn "N ảnh" trên thẻ tin */
export const demAnh = (images: unknown[] | null | undefined) => (images || []).length - layVideo(images).length;

export function cleanImages(images: unknown[]): string[] {
  return (images || [])
    .map((i) => (typeof i === "string" ? i : (i as { uri?: string })?.uri))
    .filter((u): u is string => typeof u === "string" && /^https?:\/\//.test(u) && !u.includes("facebook.com/media") && !LA_VIDEO.test(u.split(/[?#]/)[0]))
    .map(hiRes);
}
