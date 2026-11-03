import { giayCanh, VoMap } from "../components/Vo";

// Props do scripts/lay-tin.mjs ghi ra (public/tin/<id>/props.json)
export type TinProps = {
  id: string;
  ma: string;
  loai: string;
  khuVuc: string;
  quan: string;
  dienTich: number | null;
  phongNgu: number | null;
  noiThat: string | null;
  deal: string;
  gia: { so: string; donVi: string };
  phi: [string, string][];
  coc: string | null;
  anh: string[];
  hotline: string;
  vo?: VoMap; // lời đọc: hero, anh, phi, cta
};

// Độ dài từng phần (giây) - nhân fps khi tính khung
export const NHIP = { hero: 2.6, anh: 1.6, phi: 3.6, cta: 3.4 } as const;

export const khungTin = (p: TinProps, fps: number) => {
  const vo = p.vo ?? {};
  const hero = Math.round(giayCanh(NHIP.hero, vo.hero) * fps);
  const soAnhPhu = Math.max(0, p.anh.length - 1);
  // lời đoạn ảnh trải đều trên các ảnh phụ
  const anh = Math.round((soAnhPhu ? giayCanh(NHIP.anh * soAnhPhu, vo.anh) / soAnhPhu : NHIP.anh) * fps);
  const coPhi = p.deal === "cho_thue" && (p.phi.length > 0 || !!p.coc);
  const phi = coPhi ? Math.round(giayCanh(NHIP.phi, vo.phi) * fps) : 0;
  const cta = Math.round(giayCanh(NHIP.cta, vo.cta) * fps);
  const tuAnh = hero;
  const tuPhi = tuAnh + soAnhPhu * anh;
  const tuCta = tuPhi + phi;
  return { hero, anh, soAnhPhu, phi, cta, tuAnh, tuPhi, tuCta, tong: tuCta + cta };
};

// Mẫu để mở Studio khi chưa chạy lay-tin.mjs
export const TIN_MAU: TinProps = {
  id: "mau", ma: "RH000000", loai: "Studio", khuVuc: "Đường mẫu, Quận 1", quan: "Quận 1",
  dienTich: 25, phongNgu: null, noiThat: "Cơ bản", deal: "cho_thue",
  gia: { so: "5", donVi: "triệu/tháng" }, phi: [["Điện", "3.500 đ/kWh"]], coc: null, anh: [], hotline: "0387 365 020",
};
