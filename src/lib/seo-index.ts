// Ngưỡng index dùng chung cho metadata + sitemap:
// Lệch nhau thì Google gặp trang index được mà sitemap không khai (hoặc ngược lại)
// Chặn triệt để rủi ro Thin Content (nội dung mỏng/rỗng)
export const NGUONG = {
  tinh: 5,
  quan: 5,
  loai: 8,
  boLoc: 15,
  diemNeo: 40,
  duAn: 3,
} as const;

export function robotsTheoSoTin(n: number, nguong: number) {
  return n >= nguong ? { index: true, follow: true } : { index: false, follow: true };
}

/** Số tin bù tối đa (tin loại khác cùng quận) hiện dưới trang loại BĐS trong quận đang ít tin. */
export const TIN_BU_TOI_DA = 12;

/**
 * 28/11 (Search Console): "Cho thuê nhà Quận 4" có 765 lượt hiển thị, vị trí 12,6 thì tụt còn 1 tin -> noindex,
 * Google gỡ dần trang đang lên hạng; sitemap (cache riêng) vẫn khai trang đó -> cảnh báo "noindex".
 * Trang LOẠI BĐS TRONG QUẬN còn ít nhất 1 tin vẫn index nếu cả quận đủ tin để bù (khối "tin khác cùng quận"),
 * tức trang luôn hiện đủ NGUONG.loai tin. Hết hẳn tin (0) thì route vẫn chuyển về trang cha như cũ.
 * Sitemap KHÔNG đổi (vẫn đòi nLoai >= NGUONG.loai) -> mọi URL sitemap khai đều index được.
 */
export function canTinBu(nLoai: number, laLoaiTrongQuan: boolean): boolean {
  return laLoaiTrongQuan && nLoai >= 1 && nLoai < NGUONG.loai;
}

export function robotsTrangLoaiQuan(nLoai: number, nQuan: number, laLoaiTrongQuan: boolean) {
  if (!canTinBu(nLoai, laLoaiTrongQuan)) return robotsTheoSoTin(nLoai, NGUONG.loai);
  const nBu = Math.min(Math.max(nQuan - nLoai, 0), TIN_BU_TOI_DA);
  return robotsTheoSoTin(nLoai + nBu, NGUONG.loai);
}

export const BO_LOC_SEO = {
  "duoi-3-trieu": { nhan: "dưới 3 triệu", priceMax: 3_000_000 },
  "duoi-4-trieu": { nhan: "dưới 4 triệu", priceMax: 4_000_000 },
  "studio": { nhan: "studio", tuKhoa: ["studio"] },
  "gac-lung": { nhan: "có gác lửng", tuKhoa: ["gác"] },
  "full-noi-that": { nhan: "full nội thất", tuKhoa: ["full nội thất", "đầy đủ nội thất"] },
} as const;

export type BoLocSlug = keyof typeof BO_LOC_SEO;
export type BoLocConfig = (typeof BO_LOC_SEO)[BoLocSlug];

export function boLocTuSlug(slug?: string | null): BoLocConfig | null {
  return slug && slug in BO_LOC_SEO ? BO_LOC_SEO[slug as BoLocSlug] : null;
}

export const TRANG_TINH_TOI_DA = 10;
export const TIN_MOI_TRANG = 20;
