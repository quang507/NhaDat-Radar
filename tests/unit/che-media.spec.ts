import { test, expect } from "@playwright/test";
import { veGoc, MEDIA_CU, NGUON } from "../../crawler/che-media.mjs";
import nextConfig from "../../next.config.mjs";

// 5/11: ảnh/video rổ hàng tải thẳng từ máy chủ đối tác, Vercel không chuyển tiếp byte nào (từng vượt Fast Origin
// Transfer, bị khoá deploy 4/11). URL /m cũ còn trong HTML cache / Google Images: next.config redirect về nguồn,
// scripts/che-media-cu.mjs đổi DB về nguồn bằng veGoc. Hai bên phải ra cùng một URL gốc.
const HF = `${NGUON[0][0]}30600db0-IMG%201.jpg?alt=media&token=0bbb1bce-2ded-4024`;
const HF_VIDEO = HF.replace(".jpg", ".mp4");
const EH = "https://media.evohome.it.com/transaction-units/f56fa7fa-ac7e.jpg";
const quaM = (goc: string) => {
  for (const [nguon, ma] of NGUON) if (goc.startsWith(nguon)) return MEDIA_CU + ma + goc.slice(nguon.length);
  throw new Error("không thuộc nguồn nào: " + goc);
};

test("veGoc: URL /m cũ về đúng URL gốc, URL khác giữ nguyên", () => {
  for (const goc of [HF, HF_VIDEO, EH]) {
    expect(veGoc(quaM(goc))).toBe(goc);
    expect(veGoc(goc)).toBe(goc);
  }
  const khac = "https://cdn.chotot.com/abc.jpg";
  expect(veGoc(khac)).toBe(khac);
  expect(veGoc(null)).toBe(null);
});

test("next.config: không còn rewrite/header /m (Vercel không chuyển tiếp ảnh)", async () => {
  expect(nextConfig.rewrites).toBeUndefined();
  const headers = await nextConfig.headers!();
  expect(headers.some((h) => h.source.startsWith("/m"))).toBe(false);
});

test("next.config: redirect /m/h, /m/e ra cùng URL gốc như veGoc", async () => {
  const rs = (await nextConfig.redirects!()).filter((r) => r.source.startsWith("/m/"));
  expect(rs).toHaveLength(NGUON.length);
  // mô phỏng path-to-regexp: "/m/h/:f*" -> phần sau tiền tố thay vào ":f*" ở đích, query Next tự nối lại
  const theoRedirect = (u: string) => {
    const url = new URL(u);
    for (const r of rs) {
      const tienTo = r.source.replace(/:\w+\*$/, "");
      if (!url.pathname.startsWith(tienTo)) continue;
      expect(r.permanent).toBe(true);
      return r.destination.replace(/:\w+\*$/, url.pathname.slice(tienTo.length)) + url.search;
    }
    throw new Error("không redirect: " + u);
  };
  for (const goc of [HF, HF_VIDEO, EH]) expect(theoRedirect(quaM(goc))).toBe(goc);
});
