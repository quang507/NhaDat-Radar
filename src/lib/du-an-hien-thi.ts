// Hiển thị DỰ ÁN (17/11/2026): giá, chủ đầu tư, bảng thông số, khoá nhận ra dự án trùng.
// Nguồn dự án (mogi.vn + kho AI Ơi cũ) ghi dữ liệu không đồng nhất nên gom luật ở một chỗ, dùng chung
// trang danh sách /projects, trang chi tiết /projects/[id] và (bản .mjs trùng luật) crawler/mogi-projects.mjs.
import { fmtPrice } from "./format";

/** Giá dự án cho thẻ: 747/2.386 dự án chỉ có giá THẤP nhất -> "Từ 1.19 tỷ", không ghép "… - Thoả thuận". */
export function giaDuAn(min: number | null | undefined, max: number | null | undefined): string {
  const a = min || 0, b = max || 0;
  if (a && b && a !== b) return `${fmtPrice(a, "ban")} - ${fmtPrice(b, "ban")}`;
  if (a && b) return fmtPrice(a, "ban");
  if (a) return `Từ ${fmtPrice(a, "ban")}`;
  if (b) return `Đến ${fmtPrice(b, "ban")}`;
  return "Giá thoả thuận";
}

/** Nguồn hay dính nhãn vào tên ("Chủ đầu tư: Hưng Thịnh Corporation") -> thẻ ra "CĐT: Chủ đầu tư: …". */
export function tenChuDauTu(s: string | null | undefined): string {
  const t = String(s ?? "").replace(/^\s*(?:chủ\s*đầu\s*tư|cđt)\s*[:：-]\s*/i, "").trim();
  return /^[-–—\s]*$/.test(t) ? "" : t;
}

const coGiaTri = (v: unknown) => v !== null && v !== undefined && String(v).trim() !== "";

/** "10000 m2" -> "10.000 m²"; "29.000m²" -> "29.000 m²" */
function dienTich(v: unknown): string {
  return String(v ?? "").trim()
    .replace(/\s*m\s*(?:2|²)(?!\w)/gi, " m²")
    .replace(/^(\d{4,})(?= m²)/, (n) => Number(n).toLocaleString("vi-VN"));
}

const soGon = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");
const trieuM2 = (v: number) => soGon(v / 1e6);

/**
 * Bảng thông số dự án -> các cặp [nhãn, giá trị] để hiện.
 * 2.276/2.386 dự án mang bộ khoá thô của kho cũ (tong_dien_tich, dien_tich_tu_m2, ban_giao, gia_dong…, đa phần null)
 * và trang từng in thẳng "tong_dien_tich 29.000m²". Khoá tiếng Việt của nguồn mogi (Tình trạng, Pháp lý…) giữ nguyên.
 * `handover` (cột riêng) là nguồn duy nhất của dòng "Bàn giao"; `coGia`: khung giá bên phải đã có giá thì bỏ "Giá tham khảo".
 */
export function hangThongSo(specs: Record<string, unknown> | null | undefined, opt: { handover?: string | null; coGia?: boolean } = {}): [string, string][] {
  const s = specs ?? {};
  const kq: [string, string][] = [];
  const them = (nhan: string, v: string) => {
    if (v && !kq.some(([k]) => k.toLowerCase() === nhan.toLowerCase())) kq.push([nhan, v]);
  };

  if (coGiaTri(s.tong_dien_tich)) them("Tổng diện tích", dienTich(s.tong_dien_tich));
  const tu = coGiaTri(s.dien_tich_tu_m2) ? Number(s.dien_tich_tu_m2) : NaN;
  const den = coGiaTri(s.dien_tich_den_m2) ? Number(s.dien_tich_den_m2) : NaN;
  if (tu > 0 && den > 0 && tu !== den) them("Diện tích căn", `${soGon(tu)} - ${soGon(den)} m²`);
  else if (tu > 0 || den > 0) them("Diện tích căn", `${soGon(tu > 0 ? tu : den)} m²`);
  if (coGiaTri(s.nam_khoi_cong)) them("Khởi công", String(s.nam_khoi_cong).trim());
  if (coGiaTri(s.nam_hoan_thanh)) them("Hoàn thành", String(s.nam_hoan_thanh).trim());
  const m1 = Number(s.gia_m2_min), m2 = Number(s.gia_m2_max);
  if (m1 > 0 && m2 > 0 && m1 !== m2) them("Giá / m²", `${trieuM2(m1)} - ${trieuM2(m2)} triệu/m²`);
  else if (m1 > 0 || m2 > 0) them("Giá / m²", `${trieuM2(m1 > 0 ? m1 : m2)} triệu/m²`);
  if (!opt.coGia && coGiaTri(s.gia_dong)) them("Giá tham khảo", String(s.gia_dong).trim());

  const THO = new Set(["tong_dien_tich", "dien_tich_tu_m2", "dien_tich_den_m2", "nam_khoi_cong", "nam_hoan_thanh", "gia_m2_min", "gia_m2_max", "gia_dong", "ban_giao"]);
  for (const [k, v] of Object.entries(s)) {
    if (THO.has(k) || !coGiaTri(v)) continue;
    them(k.includes("_") ? k.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase()) : k, dienTich(v) === String(v).trim() ? String(v).trim() : /m\s*(?:2|²)/i.test(String(v)) ? dienTich(v) : String(v).trim());
  }
  const banGiao = opt.handover || (coGiaTri(s.ban_giao) ? String(s.ban_giao).trim() : "");
  if (banGiao) them("Bàn giao", banGiao);
  return kq;
}

/**
 * Khoá nhận ra cùng một dự án: tên bỏ dấu, bỏ khoảng trắng và ký tự lạ + quận. "9 View Apartment" / "9View Apartment" /
 * "9VIEW APARTMENT" cùng quận là một. Số khác nhau ("Green Park" / "Green Park 2") là hai dự án.
 * Bản .mjs cùng luật: khoaTrung() trong crawler/mogi-projects.mjs (tests/unit/du-an-hien-thi.spec.ts giữ hai bản khớp).
 */
export function khoaTrungDuAn(ten: string | null | undefined, quan: string | null | undefined): string {
  const b = (x: string | null | undefined) => String(x ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]+/g, "");
  return `${b(ten)}|${b(quan)}`;
}

export type MucTrang = { id: string; label: string };

/**
 * Thanh mục của trang dự án (kiểu Mogi: Hình ảnh | Giới thiệu | Thị trường | Mua bán - Cho thuê): CHỈ mục có nội dung thật,
 * đúng thứ tự trên trang. Dự án "vỏ" (chỉ có tên + ảnh) không bị thanh mục dẫn tới khối trống.
 */
export function mucTrangDuAn(c: { moTa: boolean; tienIch: boolean; viTri: boolean; ban: boolean; thue: boolean; quanh: boolean; chuDauTu: boolean }): MucTrang[] {
  const ds: [boolean, MucTrang][] = [
    [c.moTa, { id: "gioi-thieu", label: "Giới thiệu" }],
    [c.tienIch, { id: "tien-ich", label: "Tiện ích" }],
    [c.viTri, { id: "vi-tri", label: "Vị trí" }],
    [c.ban, { id: "dang-ban", label: "Đang bán" }],
    [c.thue, { id: "cho-thue", label: "Cho thuê" }],
    [c.quanh, { id: "tin-quanh", label: "Tin quanh dự án" }],
    [c.chuDauTu, { id: "chu-dau-tu", label: "Chủ đầu tư" }],
  ];
  return ds.filter(([co]) => co).map(([, m]) => m);
}
