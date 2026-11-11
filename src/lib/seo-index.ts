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
