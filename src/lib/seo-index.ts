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
