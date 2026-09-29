"use client";

import { useState } from "react";
import { PROP } from "@/lib/format";

// ĐIỀU HƯỚNG KHU VỰC trang tìm kiếm (29/9, kiểu Mogi "Quận Tân Bình (10.031)").
// Số đếm do server tính từ bảng đếm cache (search/page.tsx): theo mua/thuê + loại + khu vực, CHƯA trừ
// bộ lọc giá/diện tích -> ghi rõ ở tooltip để khách không thắc mắc bấm vào ra ít tin hơn.
// Bấm = lọc tiếp trên trang tìm kiếm, GIỮ các bộ lọc khác (onPick do SearchClient truyền, dùng push()).
// Link SEO sang trang khu vực nằm ở dải "Tìm kiếm nhiều tại..." cuối trang, không phải ở đây.

export type DieuHuong = { province: string; kinds: [string, number][]; districts: [string, number][] };

const so = (n: number) => n.toLocaleString("vi-VN");
const GHI_CHU = "Số tin đang có theo mua/thuê, loại nhà và khu vực - chưa trừ bộ lọc giá, diện tích";
const tenGon = (d: string) => d.replace(/^(Quận|Huyện|Thị xã|Thành phố) (?=\D)/, "");

/** Điện thoại/tablet (<lg): 1 hàng chip quận vuốt ngang dưới thanh Lọc */
export function ChipQuan({ dh, district, onPick }: { dh: DieuHuong; district: string; onPick: (district: string) => void }) {
  if (!dh.districts.length) return null;
  const chip = "shrink-0 snap-start text-xs px-3 py-1.5 rounded-full border whitespace-nowrap transition";
  return (
    <div className="lg:hidden flex gap-2 overflow-x-auto snap-x scroll-px-5 -mx-5 px-5 pb-1 mb-3 [scrollbar-width:none]" title={GHI_CHU}>
      {district ? (
        <button type="button" className={`${chip} border-brand text-brand font-semibold`} onClick={() => onPick("")}>‹ Toàn {dh.province}</button>
      ) : null}
      {dh.districts.filter(([d]) => d !== district).slice(0, 20).map(([d, n]) => (
        <button key={d} type="button" className={`${chip} border-[var(--line)] bg-[var(--surface)]`} onClick={() => onPick(d)}>
          {tenGon(d)} <span className="text-[var(--ink-faint)] tabular-nums">{so(n)}</span>
        </button>
      ))}
    </div>
  );
}

/** Máy tính (lg+): cột phụ bên phải - Loại nhà đất + Quận/huyện kèm số tin */
export function SidebarKhuVuc({ dh, dealWord, kind, district, anQuan, onKind, onDistrict }: {
  dh: DieuHuong; dealWord: string; kind: string; district: string;
  anQuan: boolean;   // công tắc "địa chỉ mới" bật: duyệt theo phường mới, bỏ cấp quận
  onKind: (k: string) => void; onDistrict: (d: string) => void;
}) {
  const [du, setDu] = useState(false);
  const ds = du ? dh.districts : dh.districts.slice(0, 15);
  const dong = (on: boolean) => `w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-left text-sm transition ${on ? "bg-brand/10 text-brand font-semibold" : "hover:bg-[var(--surface-2)]"}`;
  return (
    <aside className="hidden lg:flex flex-col gap-4" title={GHI_CHU}>
      {dh.kinds.length > 0 && (
        <div className="card rounded-xl p-2">
          <h2 className="font-bold text-sm px-3 pt-2 pb-1.5">Loại nhà đất</h2>
          {kind && <button type="button" className={dong(false)} onClick={() => onKind("")}>‹ Tất cả loại</button>}
          {dh.kinds.map(([k, n]) => (
            <button key={k} type="button" className={dong(k === kind)} onClick={() => onKind(k === kind ? "" : k)}>
              <span className="truncate">{(PROP as Record<string, string>)[k] || k}</span>
              <span className="ml-auto text-xs text-[var(--ink-faint)] tabular-nums">{so(n)}</span>
            </button>
          ))}
        </div>
      )}
      {!anQuan && dh.districts.length > 0 && (
        <div className="card rounded-xl p-2">
          <h2 className="font-bold text-sm px-3 pt-2 pb-1.5">{dealWord} tại {dh.province}</h2>
          {district && <button type="button" className={dong(false)} onClick={() => onDistrict("")}>‹ Toàn {dh.province}</button>}
          {ds.map(([d, n]) => (
            <button key={d} type="button" className={dong(d === district)} onClick={() => onDistrict(d === district ? "" : d)}>
              <span className="truncate">{d}</span>
              <span className="ml-auto text-xs text-[var(--ink-faint)] tabular-nums">{so(n)}</span>
            </button>
          ))}
          {dh.districts.length > 15 && (
            <button type="button" className="w-full px-3 py-2 text-sm font-semibold text-brand text-left" onClick={() => setDu((v) => !v)}>
              {du ? "Thu gọn ▴" : `Xem thêm ${dh.districts.length - 15} khu vực ▾`}
            </button>
          )}
        </div>
      )}
    </aside>
  );
}
