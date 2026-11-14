import { test, expect } from "@playwright/test";
import { soZaloMoThang, HOTLINE } from "../../src/lib/hotline";

// 14/11/2026: tin của Radar bấm "Chat qua Zalo" là mở thẳng Zalo Radar, không bắt để lại SĐT
// (30 ngày: 22 lượt mở Zalo thẳng, popup SĐT gần như không thu được số). Tin cào vẫn qua popup để che số người đăng gốc.

test("tin Radar: mở thẳng Zalo Radar, kể cả khách chưa đăng nhập", () => {
  expect(soZaloMoThang(true, null)).toBe(HOTLINE);
  expect(soZaloMoThang(true, undefined)).toBe(HOTLINE);
});

test("tin cào: chỉ mở thẳng khi đã mở khoá được Zalo người đăng, chưa thì qua popup", () => {
  expect(soZaloMoThang(false, null)).toBeNull();
  expect(soZaloMoThang(false, undefined)).toBeNull();
  expect(soZaloMoThang(false, "0909123456")).toBe("0909123456");
});
