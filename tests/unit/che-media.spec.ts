import { test, expect } from "@playwright/test";
import sharp from "sharp";
import { cheMedia, conLoNguon } from "../../crawler/che-media.mjs";
import nextConfig from "../../next.config.mjs";
import { NGUON_HF, catWatermark, tiLeLogo } from "../../src/lib/che-watermark";

// 3/11: URL ảnh/video rổ hàng che qua /m của Radar - bảng tiền tố (che-media.mjs), rewrites (next.config.mjs) và
// route ảnh /m/h/[f] (NGUON_HF) phải khớp: đổi một bên mà quên bên kia là ảnh vỡ hàng loạt
const HF = `${NGUON_HF}30600db0-IMG_1.jpg?alt=media&token=0bbb1bce-2ded-4024`;
const HF_VIDEO = HF.replace(".jpg", ".mp4");
const EH = "https://media.evohome.it.com/transaction-units/f56fa7fa-ac7e.jpg";

type Rw = { source: string; destination: string };
// mô phỏng rewrite: phần cố định của source khớp đầu đường dẫn (và regex của tham số nếu có) -> thay vào destination
async function moLai(u: string) {
  const url = new URL(u);
  const ds = await nextConfig.rewrites!() as unknown as { beforeFiles: Rw[]; afterFiles: Rw[] };
  for (const r of [...ds.beforeFiles, ...ds.afterFiles]) {
    const [, goc, re] = r.source.match(/^(.*?):\w+(?:\((.*)\))?\*?$/)!;
    const duoi = url.pathname.slice(goc.length);
    if (url.pathname.startsWith(goc) && (!re || new RegExp(`^${re}$`).test(duoi))) return r.destination.replace(/:\w+\*?$/, duoi) + url.search;
  }
  return null;
}

test("cheMedia: không còn lộ tên đối tác; video + EvoHome rewrite về đúng URL gốc, ảnh HiFriendz vào route", async () => {
  for (const goc of [HF, EH, HF_VIDEO]) {
    const che = cheMedia(goc);
    expect(che.startsWith("https://nhadatradar.com/m/")).toBe(true);
    expect(conLoNguon(che)).toBe(false);
  }
  expect(await moLai(cheMedia(EH))).toBe(EH);
  expect(await moLai(cheMedia(HF_VIDEO))).toBe(HF_VIDEO);
  // ảnh HiFriendz không có rewrite nào bắt - để route src/app/m/h/[f] (cắt logo) nhận
  expect(await moLai(cheMedia(HF))).toBeNull();
  expect(cheMedia(HF)).toBe("https://nhadatradar.com/m/h/30600db0-IMG_1.jpg?alt=media&token=0bbb1bce-2ded-4024");
});

test("cheMedia: URL nguồn khác và URL đã che giữ nguyên", () => {
  const khac = "https://cdn.chotot.com/abc.jpg";
  expect(cheMedia(khac)).toBe(khac);
  expect(cheMedia(cheMedia(EH))).toBe(cheMedia(EH));
});

// ảnh giả 1000x750 nền trắng, có/không khối xanh ngọc kiểu logo ở góc trên trái
const anhGia = (logo: boolean) => sharp({ create: { width: 1000, height: 750, channels: 3, background: "#f2f2f0" } })
  .composite(logo ? [{ input: { create: { width: 380, height: 90, channels: 3, background: { r: 0, g: 160, b: 160 } } }, left: 20, top: 40 }] : [])
  .jpeg().toBuffer();

test("catWatermark: có logo góc trên -> cắt 18% trên + 12% dưới; không logo -> chỉ cắt 12% dưới", async () => {
  const coLogo = await anhGia(true), khong = await anhGia(false);
  expect(await tiLeLogo(sharp(coLogo))).toBeGreaterThan(0.01);
  expect(await tiLeLogo(sharp(khong))).toBe(0);
  expect(await sharp(await catWatermark(coLogo)).metadata()).toMatchObject({ width: 1000, height: 750 - 135 - 90 });
  expect(await sharp(await catWatermark(khong)).metadata()).toMatchObject({ width: 1000, height: 750 - 90 });
});

test("tường sơn màu mint không bị nhận nhầm là logo", async () => {
  const mint = await sharp({ create: { width: 1000, height: 750, channels: 3, background: { r: 150, g: 220, b: 200 } } }).jpeg().toBuffer();
  expect(await tiLeLogo(sharp(mint))).toBe(0);
});
