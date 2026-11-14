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

test("chuông báo máy 146: hỏng 2 lượt liền mới nhắn, nhắc lại mỗi 24 lượt, hết hỏng thì báo đã ổn", async () => {
  const { quyetDinhBao, noiDungTin } = await import("../../scripts/canh-production-bao.mjs");
  expect(quyetDinhBao({}, 0)).toEqual({ hongLienTiep: 0, gui: null });
  expect(quyetDinhBao({}, 3)).toEqual({ hongLienTiep: 1, gui: null });           // 1 lượt: có thể chập chờn
  expect(quyetDinhBao({ hongLienTiep: 1 }, 2)).toEqual({ hongLienTiep: 2, gui: "hong" });
  expect(quyetDinhBao({ hongLienTiep: 2 }, 2).gui).toBeNull();
  expect(quyetDinhBao({ hongLienTiep: 25 }, 1)).toEqual({ hongLienTiep: 26, gui: "hong" }); // 12 giờ sau nhắc lại
  expect(quyetDinhBao({ hongLienTiep: 1 }, 0).gui).toBeNull();                   // chưa từng nhắn thì khỏi báo ổn
  expect(quyetDinhBao({ hongLienTiep: 5 }, 0)).toEqual({ hongLienTiep: 0, gui: "on" });
  const tin = noiDungTin("hong", "https://www.nhadatradar.com", ["Trang chủ trả về mã 500"], 2);
  expect(tin).toContain("2 lượt");
  expect(tin).toContain("Trang chủ trả về mã 500");
  expect(tin).not.toContain("—");
});
