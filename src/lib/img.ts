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

/**
 * Làm gọn 1 tin cho TRANG DANH SÁCH (30/9): trang tìm kiếm từng nặng 589 KB vì mỗi thẻ mang nguyên mô tả
 * (thẻ chỉ hiện 2 dòng, điện thoại không hiện) + mọi URL ảnh (thẻ dùng tối đa 4). Giữ số ảnh thật ở so_anh.
 */
export function gonChoDanhSach<T extends { description?: string | null; images?: string[] | null; so_anh?: number; co_video?: boolean }>(x: T): T {
  const anh = (x.images || []).filter((u) => !LA_VIDEO.test(String(u).split(/[?#]/)[0]));
  return {
    ...x,
    so_anh: x.so_anh ?? anh.length,
    co_video: x.co_video ?? anh.length < (x.images || []).length,
    images: anh.slice(0, 4),
    description: x.description ? x.description.slice(0, 160) : x.description,   // thẻ ngang desktop hiện 2 dòng ~150 ký tự
  };
}

/** số ảnh + có video không - dùng được cả với tin đã làm gọn (so_anh/co_video) lẫn tin đầy đủ */
export function thongTinAnh(x: { images?: string[] | null; so_anh?: number; co_video?: boolean }) {
  return { so: x.so_anh ?? demAnh(x.images), video: x.co_video ?? layVideo(x.images).length > 0 };
}

export function cleanImages(images: unknown[]): string[] {
  return (images || [])
    .map((i) => (typeof i === "string" ? i : (i as { uri?: string })?.uri))
    .filter((u): u is string => typeof u === "string" && /^https?:\/\//.test(u) && !u.includes("facebook.com/media") && !LA_VIDEO.test(u.split(/[?#]/)[0]))
    .map(hiRes);
}
