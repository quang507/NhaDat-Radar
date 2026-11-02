import { test, expect } from "@playwright/test";
import { boTinTrung } from "../../src/lib/tin-trung";

// 3/11: trang chủ từng hiện 1 căn 3 lần (môi giới đăng nhiều nhóm Zalo). Cùng tiêu đề (khác hoa/thường, dấu, khoảng
// trắng) + cùng giá + cùng diện tích là trùng; khác giá hoặc diện tích thì giữ cả hai. Giữ bản đứng trước.
test("boTinTrung: gộp tin trùng, giữ tin khác giá/diện tích", () => {
  const ds = [
    { id: "a", title: "Bán CHDV Thảo Điền 17PN", price_vnd: 42_800_000_000, area_m2: 141.5 },
    { id: "b", title: "bán chdv thảo điền  17pn!", price_vnd: 42_800_000_000, area_m2: 141.5 },
    { id: "c", title: "Bán CHDV Thảo Điền 17PN", price_vnd: 40_000_000_000, area_m2: 141.5 },
    { id: "d", title: "Studio 20m² Gò Vấp", price_vnd: 3_800_000, area_m2: 20 },
    { id: "e", title: "Studio 20m² Gò Vấp", price_vnd: 3_800_000, area_m2: 25 },
  ];
  expect(boTinTrung(ds).map((x) => x.id)).toEqual(["a", "c", "d", "e"]);
});
