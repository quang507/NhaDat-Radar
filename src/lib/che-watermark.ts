import sharp from "sharp";

// Cắt logo đối tác khỏi ảnh rổ hàng HiFriendz (3/11) - route /m/h/[f] gọi trước khi trả ảnh, kết quả cache CDN.
// Soi 36 ảnh mẫu: ~3/4 ảnh có logo, theo hai khuôn cố định:
//   - khối "HiFriendz / Hãy sống theo cách của bạn" màu xanh ngọc ở góc trên trái (x 2-41%, y 5-17%)
//   - dải logo nhỏ màu trắng chạy ngang mép dưới (y ~91-96%)
// Góc trên trái nhận bằng màu (đỏ thấp, lục ≈ lam, đủ sáng): ảnh không logo ra 0.000, ảnh có logo >= 0.067, tường sơn
// mint có kênh đỏ cao nên không lẫn. Dải dưới màu trắng không nhận được bằng màu -> luôn cắt 12% đáy (phần sàn).
// Chưa xử lý: bản logo trắng ở góc trên và chữ "HIFRIENDZ HOUSING" giữa đáy (~4/36 ảnh mẫu).
/** thư mục ảnh HiFriendz - khớp bảng tiền tố trong crawler/che-media.mjs (tests/unit/che-media.spec.ts kiểm) */
export const NGUON_HF = "https://firebasestorage.googleapis.com/v0/b/hifriendz-agent.firebasestorage.app/o/listings%2Fuploads%2F";

const VUNG_LOGO = { rong: 0.45, cao: 0.2 };
const NGUONG_LOGO = 0.01;
const CAT_TREN = 0.18;
const CAT_DUOI = 0.12;

const laMauLogo = (r: number, g: number, b: number) => r < 110 && g > 120 && Math.abs(g - b) < 40 && g - r > 70;

/** tỉ lệ điểm ảnh màu logo trong vùng góc trên trái (đo trên bản thu nhỏ 400px cho nhanh) */
export async function tiLeLogo(anh: sharp.Sharp): Promise<number> {
  const { data, info } = await anh.clone().resize({ width: 400 }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const vw = Math.round(info.width * VUNG_LOGO.rong), vh = Math.round(info.height * VUNG_LOGO.cao);
  let n = 0;
  for (let y = 0; y < vh; y++) for (let x = 0; x < vw; x++) {
    const i = (y * info.width + x) * 3;
    if (laMauLogo(data[i], data[i + 1], data[i + 2])) n++;
  }
  return n / (vw * vh);
}

/** ảnh gốc -> JPEG đã cắt logo (tối đa 1600px ngang) */
export async function catWatermark(goc: Buffer): Promise<Buffer> {
  const anh = sharp(goc, { failOn: "none" }).rotate();   // xoay theo EXIF trước khi đo/cắt
  const m = await sharp(goc, { failOn: "none" }).metadata();
  const [w, h] = (m.orientation ?? 1) >= 5 ? [m.height ?? 0, m.width ?? 0] : [m.width ?? 0, m.height ?? 0];   // EXIF 5-8: xoay 90°
  const tren = (await tiLeLogo(anh)) > NGUONG_LOGO ? Math.round(h * CAT_TREN) : 0;
  const duoi = Math.round(h * CAT_DUOI);
  return anh
    .extract({ left: 0, top: tren, width: w, height: h - tren - duoi })
    .resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}
