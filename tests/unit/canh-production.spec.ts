import { test, expect } from "@playwright/test";
import { soTinTrenTrangChu, TRANG_DICH } from "../../scripts/canh-production.mjs";

test("đọc số tin trên tiêu đề trang chủ", () => {
  expect(soTinTrenTrangChu("<title>NhaDat Radar - 16.107 tin nhà đất bán &amp; cho thuê giá thật</title>")).toBe(16107);
  expect(soTinTrenTrangChu("<title>NhaDat Radar - 0 tin nhà đất bán &amp; cho thuê giá thật</title>")).toBe(0);
  expect(soTinTrenTrangChu("<title>NhaDat Radar - Sàn nhà đất bán &amp; cho thuê</title>")).toBeNull();
});

test("8 trang đích cố định", () => {
  expect(TRANG_DICH).toEqual([
    "/nha-dat-cho-thue", "/nha-dat-cho-thue/ho-chi-minh", "/nha-dat-cho-thue/ho-chi-minh/quan-go-vap",
    "/nha-dat-cho-thue/ho-chi-minh/quan-binh-thanh/phong-tro", "/nha-dat-ban/ho-chi-minh",
    "/phong-tro-gan/etown-cong-hoa", "/phong-tro-duoi-3-trieu", "/tin-tuc/gia-thue-phong-tro-quan-go-vap",
  ]);
});
