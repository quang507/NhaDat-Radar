"use client";

import { PROP } from "@/lib/format";

const KIND_IMG: Record<string, string> = {
  nha: "/categories/nha-rieng.jpg",
  dat: "/categories/dat-nen.jpg",
  can_ho: "/categories/can-ho.jpg",
  mat_bang: "/categories/mat-bang.jpg",
  phong_tro: "/categories/can-ho.jpg",
  khac: "/categories/nha-rieng.jpg",
};

export default function PropertyPlaceholder({ kind, className = "" }: { kind: string; className?: string }) {
  const img = KIND_IMG[kind] || KIND_IMG.khac;
  const label = PROP[kind] || "Bất động sản";

  // absolute inset-0: phủ kín khung ảnh (khung nào dùng cũng là relative + có kích thước). Bản w-full h-full cũ co
  // về 0×0 trong khung `grid place-items-center` của ListingCard -> ảnh minh hoạ không hiện, cụm chữ canh giữa
  // tràn ra đè nhãn "Cho thuê" / nút tim (tests/ui bo-cuc, 29/10).
  // Nhãn 1 dòng ở ĐÁY khung: đỉnh khung đã có nhãn XÁC MINH / Cho thuê (có khi 2 hàng) + nút tim, còn đáy chỉ có
  // "N ảnh" mà tin không ảnh thì không hiện. Khung thấp < 96px (cột danh sách cạnh bản đồ ở 1024: 110×69) thì 2 hàng
  // nhãn trên đã kín chỗ -> ẩn dòng chữ (container query theo chiều cao khung), thân thẻ vẫn ghi loại BĐS.
  return (
    <div className={`absolute inset-0 overflow-hidden select-none bg-slate-900 group [container-type:size] ${className}`}>
      <img
        src={img}
        alt={label}
        className="absolute inset-0 w-full h-full object-cover brightness-[0.7] group-hover:scale-105 transition-transform duration-500"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/30 to-black/20" />
      <div className="absolute bottom-2 left-2 right-2 flex justify-center z-10 [@container(max-height:95px)]:hidden">
        <span className="max-w-full truncate whitespace-nowrap px-1.5 py-0.5 rounded-sm bg-black/60 text-overline text-white">
          <span className="uppercase">{label}</span>
          <span className="font-medium tracking-normal text-amber-200"> · Ảnh minh hoạ</span>
        </span>
      </div>
    </div>
  );
}
