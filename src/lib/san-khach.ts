// SĂN KHÁCH TÌM PHÒNG (2/10) - soạn sẵn câu BÌNH LUẬN + TIN NHẮN RIÊNG cho bài khách đăng tìm phòng trên nhóm FB,
// kèm các phòng rổ hàng khớp nhu cầu. Nhân viên chép -> dán -> gửi tay (/admin?tab=san-khach).
// Cách làm học từ môi giới chốt nhiều: thấy bài là bình luận + nhắn riêng NGAY, khách rep hay không cũng nhắn.
import { fmtPrice } from "./format";
import { HOTLINE } from "./hotline";

export type NhuCau = {
  quan?: string[]; gia_tu?: number | null; gia_den?: number | null;
  loai_phong?: string | null; so_nguoi?: number | null; ngay_vao?: string | null; yeu_cau?: string[];
};
export type PhongKhop = { id: string; title: string; price_vnd: number | null; deal?: string | null; district?: string | null };

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://nhadatradar.com";
const LOAI: Record<string, string> = { phong_tro: "phòng trọ", can_ho: "căn hộ", nha: "nhà nguyên căn", mat_bang: "mặt bằng", o_ghep: "chỗ ở ghép" };
const soDep = HOTLINE.replace(/^(\d{4})(\d{3})(\d{3})$/, "$1 $2 $3");

/** "Quận Gò Vấp" -> "Gò Vấp", "Quận 7" giữ nguyên, "TP. Thủ Đức" -> "Thủ Đức" */
export const quanGon = (d: string) => d.trim().replace(/^(Quận|Huyện|Thị xã|TP\.|Thành phố) (?=\D)/i, "");

function khoangGia(nc: NhuCau) {
  const tr = (v: number) => `${(v / 1e6).toFixed(1).replace(/\.0$/, "").replace(".", ",")}tr`;
  if (nc.gia_tu && nc.gia_den) return ` ${tr(nc.gia_tu)}-${tr(nc.gia_den)}`;
  if (nc.gia_den) return ` dưới ${tr(nc.gia_den)}`;
  if (nc.gia_tu) return ` từ ${tr(nc.gia_tu)}`;
  return "";
}
const noiQuan = (nc: NhuCau) => (nc.quan?.length ? nc.quan.map(quanGon).join(", ") : "");

/** Câu bình luận dưới bài - ngắn, không link (link trong bình luận dễ bị FB ẩn), mời nhắn riêng */
export function cauBinhLuan(nc: NhuCau, phong: PhongKhop[]) {
  const q = noiQuan(nc), loai = LOAI[nc.loai_phong || ""] || "phòng";
  return phong.length
    ? `Bên mình đang có ${phong.length} ${loai} trống${q ? ` ở ${q}` : ""}${khoangGia(nc)} đúng ý bạn, mình nhắn riêng bạn ảnh + giá nha 🏠`
    : `Bên mình có ${loai}${q ? ` ${q}` : ""}${khoangGia(nc)} nè bạn, mình nhắn riêng bạn xem ảnh nha 🏠`;
}

/** Tin nhắn riêng - kèm link từng phòng khớp + số Radar */
export function tinNhanRieng(ten: string | null, nc: NhuCau, phong: PhongKhop[]) {
  const q = noiQuan(nc), loai = LOAI[nc.loai_phong || ""] || "phòng";
  const dong = [
    `Chào ${ten ? ten.split(" ").slice(-1)[0] : "bạn"}, mình bên NhaDat Radar thấy bạn đang tìm ${loai}${q ? ` ${q}` : ""}${khoangGia(nc)}.`,
  ];
  if (phong.length) {
    dong.push("Bên mình đang có mấy phòng trống hợp ý, ảnh thật ở link:");
    phong.forEach((p, i) => dong.push(`${i + 1}. ${p.title} - ${fmtPrice(p.price_vnd, p.deal || "cho_thue")}\n${SITE}/listings/${p.id}`));
  } else {
    dong.push(`Bạn xem thêm phòng trống bên mình ở đây nha: ${SITE}/nha-dat-cho-thue`);
  }
  dong.push(`Bạn ưng phòng nào mình hẹn xem miễn phí luôn nha. Gọi/Zalo: ${soDep}`);
  return dong.join("\n");
}

/** Điều kiện .or() PostgREST lọc quận cho phòng khớp ("7" -> đúng "Quận 7"; tên chữ -> chứa tên) */
export function dieuKienQuan(quan: string[] | undefined) {
  const ds = (quan || []).map(quanGon).map((s) => s.replace(/[,()*%]/g, " ").trim()).filter(Boolean).slice(0, 3);
  if (!ds.length) return null;
  return ds.map((d) => (/^\d+$/.test(d) || /^Quận \d+$/i.test(d) ? `district.eq.Quận ${d.replace(/\D/g, "")}` : `district.ilike.*${d}*`)).join(",");
}
