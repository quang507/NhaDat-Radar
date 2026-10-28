// Chụp các màn chính ở 3 khổ (375 / 768 / 1440) × sáng/tối để soát giao diện một lượt.
//
//   node scripts/chup-man-hinh.mjs                       mặc định http://localhost:3001 (preview next-prod)
//   node scripts/chup-man-hinh.mjs --base https://nhadatradar.com --trang chu,tim,tin --full
//
// Ảnh ra scratch/ui-shots/<giờ>/<trang>-<khổ>-<sáng|tối>.png (scratch/ đã gitignore).
// --full chụp cả trang (nặng); mặc định chỉ màn đầu - nơi khách quyết định ở lại hay đi.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const arg = (ten, md) => {
  const i = process.argv.indexOf(`--${ten}`);
  return i > -1 ? process.argv[i + 1] : md;
};
const BASE = arg("base", "http://localhost:3001").replace(/\/$/, "");
const FULL = process.argv.includes("--full");

const KHO = { dt: { width: 375, height: 812, isMobile: true, hasTouch: true }, tablet: { width: 768, height: 1024 }, pc: { width: 1440, height: 900 } };
const TRANG = {
  chu: "/",
  tim: "/search?deal=cho_thue&province=H%E1%BB%93+Ch%C3%AD+Minh",
  bando: "/search?deal=cho_thue&province=H%E1%BB%93+Ch%C3%AD+Minh&ban_do=1",
  tin: null, // lấy tin đầu tiên trên trang chủ
  dinhgia: "/dinh-gia",
};
const chon = arg("trang", Object.keys(TRANG).join(",")).split(",");

const ra = join("scratch", "ui-shots", new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-"));
mkdirSync(ra, { recursive: true });

const browser = await chromium.launch();
try {
  if (chon.includes("tin")) {
    const p = await browser.newPage();
    await p.goto(BASE + "/", { waitUntil: "domcontentloaded" });
    TRANG.tin = await p.locator('a[href^="/listings/"]').first().getAttribute("href");
    await p.close();
  }
  for (const ten of chon) {
    const duong = TRANG[ten];
    if (!duong) { console.warn(`bỏ qua "${ten}"`); continue; }
    for (const [kho, vp] of Object.entries(KHO)) {
      for (const scheme of ["light", "dark"]) {
        const { width, height, ...them } = vp;
        const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, locale: "vi-VN", ...them });
        const page = await ctx.newPage();
        await page.goto(BASE + duong, { waitUntil: "load", timeout: 60000 });
        await page.waitForTimeout(ten === "bando" ? 4000 : 1200); // bản đồ cần thời gian vẽ ô + pin
        const tep = join(ra, `${ten}-${kho}-${scheme === "light" ? "sang" : "toi"}.png`);
        await page.screenshot({ path: tep, fullPage: FULL });
        // tràn ngang là lỗi bố cục phổ biến nhất ở 375px
        const tran = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        console.log(`${tep}${tran > 0 ? `   ⚠ tràn ngang ${tran}px` : ""}`);
        await ctx.close();
      }
    }
  }
} finally {
  await browser.close();
}
console.log(`\nXong: ${ra}`);
