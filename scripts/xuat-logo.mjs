// Xuất lại các ảnh PNG/ICO của logo từ SVG trong public/ (icon app, favicon, logo Google, ảnh chia sẻ).
//
//   node scripts/xuat-logo.mjs --kiem    vẽ SVG ở bản git HEAD và so pixel với PNG đang có (xem bố cục có khớp không)
//   node scripts/xuat-logo.mjs           ghi đè PNG/ICO từ SVG hiện tại
//
// 28/10: tạo khi lấp khe trắng góc dưới-trái thân chữ R - PNG xuất tay trước đây không có script đi kèm.
import { chromium } from "playwright";
import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const KIEM = process.argv.includes("--kiem");
const svg = (ten) => KIEM ? execSync(`git show HEAD:public/${ten}`, { encoding: "utf8" }) : readFileSync(`public/${ten}`, "utf8");
const longSvg = (s) => s.replace(/^<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");

// Ảnh vuông từ icon.svg (nền emerald, R trắng). k = cỡ chữ R so với icon.svg (dò bằng --kiem khớp ảnh cũ):
// icon-192 0.88 = vùng an toàn cho icon PWA "maskable", apple-touch 0.94, icon.png 1.06
const VUONG = [["icon.png", 64, 1.06], ["icon-192.png", 192, 0.88], ["icon-512.png", 512, 1], ["apple-touch-icon.png", 180, 0.94], ["logo-google-120.png", 120, 1]];
// Ảnh chia sẻ 1200x630: logo-dark trên nền slate-900, khung R (hình thật) đặt tại x,y với chiều cao h
const OG = { ten: "og-default.png", w: 1200, h: 630, nen: "#0f172a", x: 470, y: 143, cao: 345 };

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent("<html><body style='margin:0'></body></html>");

async function ve(svgText, w, h, k = 1, nen = null) {
  // trả PNG base64 vẽ bằng canvas (giữ alpha). k != 1: tô nền rồi vẽ hình (bỏ <rect> nền của SVG) thu/phóng quanh tâm
  return page.evaluate(async ({ svgText, w, h, k, nen }) => {
    const src = k === 1 ? svgText : svgText.replace(/<rect[^>]*\/>/, "");
    const url = URL.createObjectURL(new Blob([src], { type: "image/svg+xml" }));
    const img = await new Promise((r, j) => { const i = new Image(); i.onload = () => r(i); i.onerror = j; i.src = url; });
    const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d");
    if (k === 1) x.drawImage(img, 0, 0, w, h);
    else { x.fillStyle = nen; x.fillRect(0, 0, w, h); const sw = w * k, sh = h * k; x.drawImage(img, (w - sw) / 2, (h - sh) / 2, sw, sh); }
    return c.toDataURL("image/png").split(",")[1];
  }, { svgText, w, h, k, nen });
}
async function lech(b64a, fileB) {
  const b64b = readFileSync(`public/${fileB}`).toString("base64");
  return page.evaluate(async ({ a, b }) => {
    const load = (s) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = "data:image/png;base64," + s; });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    const w = ib.width, h = ib.height; const px = (im) => { const c = document.createElement("canvas"); c.width = w; c.height = h; const x = c.getContext("2d"); x.drawImage(im, 0, 0, w, h); return x.getImageData(0, 0, w, h).data; };
    const da = px(ia), db = px(ib); let s = 0; for (let i = 0; i < da.length; i++) s += Math.abs(da[i] - db[i]);
    return +(s / da.length).toFixed(2);
  }, { a: b64a, b: b64b });
}

const icon = svg("icon.svg");
const ogSvg = (() => {
  const s = svg("logo-dark.svg"); const k = OG.cao / 107.5; // hình thật của R: x 119.4-205.8, y 54.8-162.3
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG.w}" height="${OG.h}" viewBox="0 0 ${OG.w} ${OG.h}"><rect width="${OG.w}" height="${OG.h}" fill="${OG.nen}"/><g transform="translate(${OG.x} ${OG.y}) scale(${k}) translate(-119.4 -54.8)">${longSvg(s).replace(/<title>.*?<\/title>/, "")}</g></svg>`;
})();

const kq = [];
const nenIcon = icon.match(/<rect[^>]*fill="([^"]+)"/)[1];
for (const [ten, n, k] of VUONG) kq.push([ten, await ve(icon, n, n, k, nenIcon)]);
kq.push([OG.ten, await ve(ogSvg, OG.w, OG.h)]);

if (KIEM) {
  for (const [ten, b64] of kq) console.log(`${ten.padEnd(22)} lệch trung bình ${await lech(b64, ten)} / 255 mỗi kênh`);
} else {
  for (const [ten, b64] of kq) { writeFileSync(`public/${ten}`, Buffer.from(b64, "base64")); console.log("ghi", ten); }
  // favicon.ico: PNG 16/32/48 gói trong ICO
  const anh = [];
  for (const n of [16, 32, 48]) anh.push([n, Buffer.from(await ve(icon, n, n), "base64")]);
  const dau = Buffer.alloc(6 + 16 * anh.length); dau.writeUInt16LE(0, 0); dau.writeUInt16LE(1, 2); dau.writeUInt16LE(anh.length, 4);
  let off = dau.length;
  anh.forEach(([n, png], i) => { const o = 6 + 16 * i; dau.writeUInt8(n, o); dau.writeUInt8(n, o + 1); dau.writeUInt16LE(1, o + 4); dau.writeUInt16LE(32, o + 6); dau.writeUInt32LE(png.length, o + 8); dau.writeUInt32LE(off, o + 12); off += png.length; });
  writeFileSync("public/favicon.ico", Buffer.concat([dau, ...anh.map(([, p]) => p)]));
  console.log("ghi favicon.ico (16/32/48)");
}
await browser.close();
