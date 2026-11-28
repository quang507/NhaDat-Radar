import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { NGUONG, TIN_BU_TOI_DA, canTinBu, robotsTrangLoaiQuan } from "../../src/lib/seo-index";

// 28/11: trang loại BĐS trong quận ít tin vẫn index khi cả quận đủ tin để bù; sitemap giữ ngưỡng đầy đủ.
const index = { index: true, follow: true };
const noindex = { index: false, follow: true };

test("đủ ngưỡng thì index như cũ, không cần tin bù", () => {
  expect(canTinBu(NGUONG.loai, true)).toBe(false);
  expect(robotsTrangLoaiQuan(NGUONG.loai, NGUONG.loai, true)).toEqual(index);
  expect(robotsTrangLoaiQuan(50, 50, true)).toEqual(index);
});

test("ít tin nhưng cả quận đủ tin để bù thì vẫn index (Cho thuê nhà Quận 4: 1 tin, quận 95 tin)", () => {
  expect(canTinBu(1, true)).toBe(true);
  expect(robotsTrangLoaiQuan(1, 95, true)).toEqual(index);
  expect(robotsTrangLoaiQuan(3, 3 + NGUONG.loai - 3, true)).toEqual(index);   // vừa đủ: 3 tin + 5 bù = 8
});

test("cả quận cũng ít tin thì noindex (tránh trang mỏng)", () => {
  expect(robotsTrangLoaiQuan(1, 4, true)).toEqual(noindex);                 // 1 + 3 bù = 4 < 8
  expect(robotsTrangLoaiQuan(2, NGUONG.loai - 1, true)).toEqual(noindex);  // 2 + 5 bù = 7 < 8
});

test("hết tin (0) hoặc không phải trang loại trong quận thì giữ quy tắc cũ", () => {
  expect(canTinBu(0, true)).toBe(false);
  expect(robotsTrangLoaiQuan(0, 95, true)).toEqual(noindex);
  expect(canTinBu(1, false)).toBe(false);
  expect(robotsTrangLoaiQuan(1, 95, false)).toEqual(noindex);
});

test("tin bù có trần, ngưỡng hiện tại vẫn bù đủ", () => {
  expect(TIN_BU_TOI_DA).toBeGreaterThanOrEqual(NGUONG.loai - 1);
});

test("sitemap khu vực vẫn đòi đủ NGUONG.loai cho trang loại BĐS (mọi URL khai đều index được)", () => {
  const s = fs.readFileSync(path.resolve(__dirname, "../../src/app/sitemap-khu-vuc.xml/route.ts"), "utf8");
  expect(s).toMatch(/kc\[deal\] >= NGUONG\.loai\) muc\.push\(\{ url: SITE \+ areaPath\(deal, p, d, k\)/);
  expect(s).not.toContain("robotsTrangLoaiQuan");
});
