import { test, expect } from "@playwright/test";
import { kiemCayRpc } from "../../src/lib/cay-khu-vuc";

const TOT = { c: [["Hồ Chí Minh", "Quận Gò Vấp", "cho_thue", "phong_tro", 1597]], w: [["Hồ Chí Minh", "Quận Gò Vấp", "Phường 5"]], s: ["ro_hang"], t: 1597 };

test("cây hợp lệ được trả nguyên", () => {
  expect(kiemCayRpc(TOT).t).toBe(1597);
});

test("cây rỗng hoặc sai khuôn thì ném lỗi, không trả cây rỗng", () => {
  for (const xau of [null, undefined, {}, { c: [], w: [], s: [], t: 0 }, { ...TOT, t: 0 }, { ...TOT, c: [] }, { ...TOT, c: "x" }, { ...TOT, t: "1597" }])
    expect(() => kiemCayRpc(xau), JSON.stringify(xau)).toThrow(/^cay_khu_vuc:/);
});
