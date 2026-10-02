import { test, expect } from "@playwright/test";
import { cauBinhLuan, tinNhanRieng, dieuKienQuan, quanGon } from "../../src/lib/san-khach";

const nc = { quan: ["Quận Gò Vấp", "Quận 7"], gia_tu: 3_000_000, gia_den: 3_500_000, loai_phong: "phong_tro" };
const phong = [{ id: "11111111-1111-1111-1111-111111111111", title: "Gác lửng 20m² - Khu vực Lê Đức Thọ, Gò Vấp", price_vnd: 3_400_000, deal: "cho_thue" }];

test("quanGon + dieuKienQuan: quận số khớp đúng, quận chữ khớp chứa", () => {
  expect(quanGon("Quận Gò Vấp")).toBe("Gò Vấp");
  expect(quanGon("Quận 7")).toBe("Quận 7");
  expect(dieuKienQuan(["Quận Gò Vấp", "Quận 7", "7"])).toBe("district.ilike.*Gò Vấp*,district.eq.Quận 7,district.eq.Quận 7");
  expect(dieuKienQuan([])).toBeNull();
  // ký tự phá cú pháp .or() bị loại
  expect(dieuKienQuan(["Bình (Thạnh), x"])).toBe("district.ilike.*Bình  Thạnh   x*");
});

test("cauBinhLuan: ngắn, không link, nêu quận + khoảng giá", () => {
  const c = cauBinhLuan(nc, phong);
  expect(c).toContain("Gò Vấp, Quận 7");
  expect(c).toContain("3tr-3,5tr");
  expect(c).not.toMatch(/https?:/);
});

test("tinNhanRieng: gọi tên, kèm link từng phòng + số Radar", () => {
  const t = tinNhanRieng("Trần Ngọc Hân", nc, phong);
  expect(t.startsWith("Chào Hân,")).toBe(true);
  expect(t).toContain("/listings/11111111-1111-1111-1111-111111111111");
  expect(t).toContain("0346 689 460");
  expect(tinNhanRieng(null, nc, [])).toContain("/nha-dat-cho-thue");
});
