import { test, expect } from "@playwright/test";
import { cheSoVanBan } from "../../src/lib/doc-quyen";

// 2/11: regex che SĐT từng cắt cả giá ("1.500.000.000" -> "1.500.0***"). Giá phải giữ nguyên, SĐT mọi kiểu viết phải bị che.
test("cheSoVanBan: giữ nguyên giá, che SĐT", () => {
  for (const gia of ["Giá 1.500.000.000 đ", "Giá 3.500.000đ/tháng", "Cọc 10,000,000", "DT 100m2, 2.000.000.000"]) {
    expect(cheSoVanBan(gia)).toBe(gia);
  }
  for (const sdt of ["0909.123.456", "0388 999 111", "0909123456", "+84 909 123 456", "84909123456"]) {
    const ra = cheSoVanBan(`Gọi ${sdt} nhé`);
    expect(ra).toContain("***");
    expect(ra.replace(/\D/g, "").length).toBeLessThan(5);
  }
  expect(cheSoVanBan("P.302 0909123456")).toBe("P.302 0909*** (liên hệ qua Radar)");
  expect(cheSoVanBan("LH 0909123456", false)).toBe("LH 0909*** (bấm Xem SĐT)");
});
