import sharp from "sharp";

// Cắt logo đối tác khỏi ảnh rổ hàng HiFriendz (3/11) - route /m/h/[f] gọi trước khi trả ảnh, kết quả cache CDN.
// Soi 108 ảnh mẫu: ~3/4 ảnh có logo, theo các khuôn:
//   - khối "HiFriendz / Hãy sống theo cách của bạn" màu xanh ngọc ở góc trên trái (y 0-17%)
//   - dải logo nhỏ màu trắng chạy ngang mép dưới: y ~91-96% (khuôn thường) hoặc ~84-88% (ảnh 1450x1085)
//   - chữ "HIFRIENDZ HOUSING SERVICES" trắng giữa đáy, y ~85-97% (~1/10 ảnh)
// Góc trên trái nhận bằng màu (đỏ thấp, lục ≈ lam, đủ sáng): ảnh không logo ra 0.000, ảnh có logo >= 0.067, tường sơn
// mint có kênh đỏ cao nên không lẫn. Logo trắng ở đáy nhận theo nét chữ: hàng có nhiều lần chuyển trắng tinh <-> tối
// trải trên nhiều đoạn bề ngang (sàn bóng / cửa sổ cháy sáng là mảng trắng lớn, ít lần chuyển). Chỉ dò từ 80% trở xuống:
// dò cao hơn thì sàn sáng ở 75% bị nhận nhầm. Không thấy dải nào vẫn cắt 16% đáy: dải mờ bán trong suốt và chữ
// "HIFRIENDZ HOUSING" mờ trên ảnh 2568x1926 (bắt đầu từ ~85.5%) không bắt được bằng nét trắng tinh.
// Chưa xử lý: logo "HiFriendz" mờ cỡ lớn giữa ảnh (~4/108 ảnh mẫu) - cắt là mất nửa ảnh.
/** thư mục ảnh HiFriendz - khớp bảng tiền tố trong crawler/che-media.mjs (tests/unit/che-media.spec.ts kiểm) */
export const NGUON_HF = "https://firebasestorage.googleapis.com/v0/b/hifriendz-agent.firebasestorage.app/o/listings%2Fuploads%2F";

const DO_RONG = 800;   // đo trên bản thu nhỏ: đủ giữ nét chữ trắng của dải đáy
const VUNG_LOGO = { rong: 0.45, cao: 0.2 };
const NGUONG_LOGO = 0.01;
const CAT_TREN = 0.18;
const DAI = { tu: 0.8, doan: 8, can: 4, soHang: 3, le: 0.015 };
const CAT_DUOI = { it: 0.16, nhieu: 0.22 };

const laMauLogo = (r: number, g: number, b: number) => r < 110 && g > 120 && Math.abs(g - b) < 40 && g - r > 70;

type Raw = { data: Buffer; w: number; h: number };
const doRaw = async (anh: sharp.Sharp): Promise<Raw> => {
  const { data, info } = await anh.clone().resize({ width: DO_RONG }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
};

function tinhTiLeLogo({ data, w, h }: Raw) {
  const vw = Math.round(w * VUNG_LOGO.rong), vh = Math.round(h * VUNG_LOGO.cao);
  let n = 0;
  for (let y = 0; y < vh; y++) for (let x = 0; x < vw; x++) {
    const i = (y * w + x) * 3;
    if (laMauLogo(data[i], data[i + 1], data[i + 2])) n++;
  }
  return n / (vw * vh);
}

/** tỉ lệ điểm ảnh màu logo trong vùng góc trên trái */
export const tiLeLogo = async (anh: sharp.Sharp) => tinhTiLeLogo(await doRaw(anh));

/** đỉnh dải logo trắng ở đáy (tỉ lệ chiều cao), null nếu không thấy */
function dinhDai({ data, w, h }: Raw): number | null {
  let dau = -1, soHang = 0;
  for (let y = Math.floor(h * DAI.tu); y < h; y++) {
    const dem = new Array<number>(DAI.doan).fill(0);
    let truoc = -1;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 3;
      const mn = Math.min(data[i], data[i + 1], data[i + 2]), mx = Math.max(data[i], data[i + 1], data[i + 2]);
      const tt = mn >= 248 ? 1 : mx < 215 ? 0 : truoc;   // trắng tinh / tối / vùng giữa giữ trạng thái trước
      if (truoc !== -1 && tt !== truoc) dem[Math.floor((x * DAI.doan) / w)]++;
      truoc = tt;
    }
    if (dem.filter((d) => d >= 2).length >= DAI.can) { if (dau < 0) dau = y; soHang++; }
  }
  return soHang >= DAI.soHang ? dau / h : null;
}

/** phần cắt trên/dưới (tỉ lệ chiều cao) cho một ảnh */
export async function phanCat(anh: sharp.Sharp): Promise<{ tren: number; duoi: number }> {
  const raw = await doRaw(anh);
  const dinh = dinhDai(raw);
  return {
    tren: tinhTiLeLogo(raw) > NGUONG_LOGO ? CAT_TREN : 0,
    duoi: dinh === null ? CAT_DUOI.it : Math.min(CAT_DUOI.nhieu, Math.max(CAT_DUOI.it, 1 - dinh + DAI.le)),
  };
}

/** ảnh gốc -> JPEG đã cắt logo (tối đa 1600px ngang) */
export async function catWatermark(goc: Buffer): Promise<Buffer> {
  const anh = sharp(goc, { failOn: "none" }).rotate();   // xoay theo EXIF trước khi đo/cắt
  const m = await sharp(goc, { failOn: "none" }).metadata();
  const [w, h] = (m.orientation ?? 1) >= 5 ? [m.height ?? 0, m.width ?? 0] : [m.width ?? 0, m.height ?? 0];   // EXIF 5-8: xoay 90°
  const cat = await phanCat(anh);
  const tren = Math.round(h * cat.tren), duoi = Math.round(h * cat.duoi);
  return anh
    .extract({ left: 0, top: tren, width: w, height: h - tren - duoi })
    .resize({ width: 1600, withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
}
