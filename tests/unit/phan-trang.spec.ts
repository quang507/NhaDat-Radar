import { test, expect } from "@playwright/test";
import { tronRoHang, oTronRoHang, xepTheoThuTu } from "../../src/lib/ro-hang";

// Phân trang thật (1/10): tải đúng 2 đoạn của trang phải ra ĐÚNG thứ tự như trộn cả danh sách rồi cắt.
test("oTronRoHang: mọi trang khớp tronRoHang(cả danh sách).slice", () => {
  for (const [R, K] of [[0, 0], [0, 45], [37, 0], [5, 100], [100, 5], [41, 41], [1, 1], [3, 2]]) {
    const rh = Array.from({ length: R }, (_, i) => ({ id: "r" + i }));
    const kh = Array.from({ length: K }, (_, i) => ({ id: "k" + i }));
    const du = tronRoHang(rh, kh);
    for (let tu = 0; tu < R + K + 20; tu += 20) {
      const o = oTronRoHang(R, K, tu, 20);
      const trang = xepTheoThuTu(o.thuTu, rh.slice(o.rhTu, o.rhTu + o.rhSo), kh.slice(o.khacTu, o.khacTu + o.khacSo));
      expect(trang.map((x) => x.id), `R=${R} K=${K} tu=${tu}`).toEqual(du.slice(tu, tu + 20).map((x) => x.id));
    }
  }
});
