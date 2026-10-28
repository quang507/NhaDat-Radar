// Tra phường/xã MỚI (sau sáp nhập 01/7/2025) từ địa chỉ CŨ mà khách / chủ nhà quen gõ.
// Dữ liệu: data/sap-nhap-phuong-2025.json - dựng bằng scripts/xay-bang-phuong.mjs từ bảng chuyển đổi chính thức NSO.
// CHỈ dùng phía server / script (file ~1,4MB) - đừng import vào component "use client".
//
// 28/10 (anh Quang): bot đăng tin bắt chủ nhà nhớ "tên phường mới", chủ nhà không nhớ -> hỏi 3 lượt rồi chuyển admin,
// trong khi chị đã ghi "Bình Hưng Hòa A, Bình Tân". 95,6% phường cũ quy đổi THẲNG được; chỉ 441 phường bị chia
// mới cần hỏi - và hỏi kiểu CHO CHỌN ("Bình Hưng Hòa hay Bình Trị Đông?"), không bắt nhớ.
import bang from "../../data/sap-nhap-phuong-2025.json";

type Kieu = "toan_bo" | "toan_bo_dan_so" | "mot_phan" | "giu_nguyen";
type XaCu = { t: string; q: string; qm: string | null; p: string; v: [string, Kieu, string?][] };
const XA_CU = bang.xaCu as unknown as Record<string, XaCu>;
const XA_MOI = bang.xaMoi as Record<string, { t: string; p: string }>;

export type XaMoi = { ma: string; ten: string; tinh: string };
export type KetQuaPhuong = {
  /** phường/xã cũ khớp được (null = không tìm thấy hoặc trùng tên mà thiếu quận để phân biệt) */
  cu: { ma: string; ten: string; quan: string; tinh: string } | null;
  /** phường mới CHẮC CHẮN cho địa chỉ nhà dân; null khi phường cũ bị chia (xem ungVien) */
  chac: XaMoi | null;
  /** các phường mới có thể (bị chia: >= 2) - đưa cho khách CHỌN */
  ungVien: XaMoi[];
  /** tên trùng ở nhiều quận mà chưa biết quận: các phường cũ cùng tên (để hỏi quận) */
  trungTen: { ten: string; quan: string; tinh: string }[];
};

const khongDau = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
/** "Phường 01" = "P.1" = "phuong 1"; bỏ tiền tố hành chính để so phần tên */
const loiXa = (s: string) => khongDau(s).replace(/[.,]/g, " ").replace(/^\s*(phuong|xa|thi tran|p|tt)\s+/, "").replace(/\b0+(\d)/g, "$1").replace(/\s+/g, " ").trim();
const loiQuan = (s: string) => khongDau(s).replace(/[.,]/g, " ").replace(/^\s*(quan|huyen|thi xa|thanh pho|tp|q|h|tx)\s+/, "").replace(/\b0+(\d)/g, "$1").replace(/\s+/g, " ").trim();
const loiTinh = (s: string) => {
  const k = khongDau(s).replace(/[.,]/g, " ").replace(/^\s*(thanh pho|tinh|tp)\s+/, "").replace(/\s+/g, " ").trim();
  return /^(hcm|tphcm|ho chi minh|sai gon|sg)$/.test(k) ? "ho chi minh" : k;
};

// chỉ mục theo tên phần lõi của phường cũ -> danh sách mã (tên như "Phường 1" lặp ở rất nhiều quận)
const THEO_TEN = new Map<string, string[]>();
for (const [ma, x] of Object.entries(XA_CU)) {
  const k = loiXa(x.t);
  THEO_TEN.set(k, [...(THEO_TEN.get(k) || []), ma]);
}

const moi = (ma: string): XaMoi => ({ ma, ten: XA_MOI[ma].t, tinh: XA_MOI[ma].p });

/** Quy đổi phường cũ -> mới. `quan`, `tinh` (tên cũ) giúp phân biệt "Phường 1" ở các quận khác nhau. */
export function phuongMoi(phuong: string, quan?: string | null, tinh?: string | null): KetQuaPhuong {
  let ds = THEO_TEN.get(loiXa(phuong)) || [];
  if (tinh) { const t = loiTinh(tinh); const loc = ds.filter((m) => loiTinh(XA_CU[m].p) === t); if (loc.length) ds = loc; }
  if (quan) { const q = loiQuan(quan); const loc = ds.filter((m) => loiQuan(XA_CU[m].q) === q); if (loc.length) ds = loc; }
  if (ds.length !== 1) {
    return { cu: null, chac: null, ungVien: [], trungTen: ds.map((m) => ({ ten: XA_CU[m].t, quan: XA_CU[m].q, tinh: XA_CU[m].p })) };
  }
  const ma = ds[0], x = XA_CU[ma];
  const cu = { ma, ten: x.t, quan: x.q, tinh: x.p };
  const ungVien = x.v.map(([m]) => moi(m));
  // nhà dân: "toàn bộ dân số" sang 1 phường -> chắc chắn dù diện tích bị chia
  const chacDong = x.v.length === 1 ? x.v[0] : x.v.find(([, k]) => k === "toan_bo_dan_so" || k === "toan_bo");
  return { cu, chac: chacDong ? moi(chacDong[0]) : null, ungVien, trungTen: [] };
}

/** Câu hỏi cho khách khi phường bị chia - cho CHỌN tên, không bắt nhớ (dùng cho bot / form đăng tin) */
export function cauHoiChonPhuong(kq: KetQuaPhuong): string | null {
  if (kq.chac || kq.ungVien.length < 2 || !kq.cu) return null;
  const ten = kq.ungVien.map((x) => x.ten.replace(/^(Phường|Xã|Đặc khu) /, ""));
  return `Từ 1/7/2025 ${kq.cu.ten} được chia sang ${ten.length} phường mới: ${ten.join(", ")}. Nhà mình thuộc phường nào ạ? (Không chắc thì cho em xin số nhà + hẻm, em tra bản đồ giúp.)`;
}
