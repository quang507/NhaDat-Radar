"use client";

import { useEffect, useRef, useState } from "react";
import { PROP } from "@/lib/format";

// BỘ LỌC MUA BÁN dựng theo batdongsan.com.vn/nha-dat-ban (1/10): hàng [Lọc] [công tắc] [Loại nhà đất ▾]
// [Khoảng giá ▾] [Diện tích ▾] [công tắc]; mỗi nút mở popover có tiêu đề + ✕, chọn xong bấm "Áp dụng"
// (không áp ngay như chip EvoHome của trang cho thuê), "Đặt lại" xoá riêng ô đó. Cột phải có
// "Lọc theo khoảng giá" / "Lọc theo diện tích" bấm là lọc. Màu giữ theo brand của Radar.

// Mốc khoảng giá / diện tích lấy đúng thang batdongsan cho mua bán. "min-max", 1 đầu rỗng = dưới/trên.
export const KHOANG_GIA_MUA: [string, string][] = [
  ["-500000000", "Dưới 500 triệu"], ["500000000-800000000", "500 - 800 triệu"], ["800000000-1000000000", "800 triệu - 1 tỷ"],
  ["1000000000-2000000000", "1 - 2 tỷ"], ["2000000000-3000000000", "2 - 3 tỷ"], ["3000000000-5000000000", "3 - 5 tỷ"],
  ["5000000000-7000000000", "5 - 7 tỷ"], ["7000000000-10000000000", "7 - 10 tỷ"], ["10000000000-20000000000", "10 - 20 tỷ"],
  ["20000000000-30000000000", "20 - 30 tỷ"], ["30000000000-40000000000", "30 - 40 tỷ"], ["40000000000-60000000000", "40 - 60 tỷ"],
  ["60000000000-", "Trên 60 tỷ"],
];
export const KHOANG_DT_MUA: [string, string][] = [
  ["-30", "Dưới 30 m²"], ["30-50", "30 - 50 m²"], ["50-80", "50 - 80 m²"], ["80-100", "80 - 100 m²"],
  ["100-150", "100 - 150 m²"], ["150-200", "150 - 200 m²"], ["200-250", "200 - 250 m²"], ["250-300", "250 - 300 m²"],
  ["300-500", "300 - 500 m²"], ["500-", "Trên 500 m²"],
];
// Loại cho mua bán (bỏ "Phòng trọ" - không ai rao bán phòng trọ lẻ), kèm icon như batdongsan
export const LOAI_MUA: [string, string, string][] = [
  ["can_ho", "Căn hộ chung cư", "🏢"], ["nha", "Nhà riêng, nhà phố, biệt thự", "🏠"], ["dat", "Đất nền, đất thổ cư", "🌱"],
  ["mat_bang", "Mặt bằng, shophouse", "🏬"], ["khac", "Bất động sản khác", "🏗️"],
];

export const tachDs = (s: string) => s.split(",").filter(Boolean);
export const tachKhoang = (v: string) => { const [a = "", b = ""] = v.split("-"); return [a, b]; };

/** Khung popover chung: tiêu đề giữa + ✕, thân cuộn, chân "Đặt lại" | "Áp dụng" */
function Popover({ tieuDe, onDong, onDatLai, onApDung, children }: {
  tieuDe: string; onDong: () => void; onDatLai: () => void; onApDung: () => void; children: React.ReactNode;
}) {
  return (
    // điện thoại: tấm trượt đáy màn hình (fixed) - hàng lọc cuộn ngang sẽ cắt mất popover absolute
    <div className={`fixed inset-x-0 bottom-0 z-[60] rounded-t-2xl sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-full sm:mt-2 sm:z-50 sm:w-[22rem] sm:max-w-[calc(100vw-2rem)] sm:rounded-xl border border-[var(--line)] bg-[var(--surface)] shadow-2xl flex flex-col`}>
      <div className="relative flex items-center justify-center px-4 py-3.5 border-b border-[var(--line)]">
        <h3 className="font-bold text-base">{tieuDe}</h3>
        <button type="button" onClick={onDong} aria-label="Đóng" className="absolute right-3 w-8 h-8 grid place-items-center rounded-lg hover:bg-[var(--surface-2)] text-lg">✕</button>
      </div>
      <div className="max-h-[22rem] overflow-y-auto px-4 py-3">{children}</div>
      <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--line)]">
        <button type="button" onClick={onDatLai} className="font-semibold text-sm px-2 py-2 hover:text-brand">Đặt lại</button>
        <button type="button" onClick={onApDung} className="h-10 px-6 rounded-lg bg-brand text-white font-semibold text-sm hover:bg-brand-ink">Áp dụng</button>
      </div>
    </div>
  );
}

/** Nút trên hàng lọc + popover đi kèm; tự đóng khi bấm ra ngoài / Esc */
function NutPop({ nhan, dangLoc, children }: {
  nhan: React.ReactNode; dangLoc: boolean;
  children: (dong: () => void) => React.ReactNode;
}) {
  const [mo, setMo] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mo) return;
    const ngoai = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setMo(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setMo(false); };
    document.addEventListener("mousedown", ngoai);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", ngoai); document.removeEventListener("keydown", esc); };
  }, [mo]);
  return (
    <div className="relative shrink-0" ref={ref}>
      <button type="button" aria-expanded={mo} onClick={() => setMo((v) => !v)}
        className={`h-10 px-4 rounded-lg border text-sm flex items-center gap-2 whitespace-nowrap transition
          ${dangLoc || mo ? "border-brand text-brand bg-brand/5 font-semibold" : "border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink-soft)] hover:border-brand"}`}>
        {nhan}
        <svg className={`w-4 h-4 transition-transform ${mo ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {mo && children(() => setMo(false))}
    </div>
  );
}

const oVuong = (on: boolean) => `grid place-items-center w-[18px] h-[18px] shrink-0 rounded border text-[0.65rem] leading-none
  ${on ? "bg-brand border-brand text-white" : "border-[var(--line-strong)] bg-[var(--surface)]"}`;
const oTron = (on: boolean) => `w-[18px] h-[18px] shrink-0 rounded-full border-2 ${on ? "border-brand bg-[radial-gradient(circle,var(--brand)_45%,transparent_50%)]" : "border-[var(--line-strong)]"}`;

/** "Loại nhà đất ▾" - tick nhiều loại (kind=nha,can_ho), "Tất cả nhà đất" = bỏ lọc */
export function PopLoai({ kind, onApDung }: { kind: string; onApDung: (kind: string) => void }) {
  const dangChon = tachDs(kind);
  const nhan = dangChon.length === 1 ? (LOAI_MUA.find(([k]) => k === dangChon[0])?.[1] ?? PROP[dangChon[0]] ?? "Loại nhà đất")
    : dangChon.length > 1 ? `Loại nhà đất (${dangChon.length})` : "Loại nhà đất";
  return (
    <NutPop nhan={<span className="max-w-[11rem] truncate">{nhan}</span>} dangLoc={dangChon.length > 0}>
      {(dong) => <ThanLoai kind={kind} dong={dong} onApDung={onApDung} />}
    </NutPop>
  );
}
function ThanLoai({ kind, dong, onApDung }: { kind: string; dong: () => void; onApDung: (kind: string) => void }) {
  const [chon, setChon] = useState(tachDs(kind));
  const doi = (k: string) => setChon((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
  const dong1 = (on: boolean, icon: string, ten: string, onClick: () => void, key?: string) => (
    <button key={key} type="button" role="checkbox" aria-checked={on} onClick={onClick}
      className="w-full flex items-center gap-3 py-2.5 text-left text-sm hover:text-brand">
      <span className="w-5 text-center" aria-hidden>{icon}</span>
      <span className={`flex-1 ${on ? "font-semibold text-brand" : ""}`}>{ten}</span>
      <span className={oVuong(on)}>{on ? "✓" : ""}</span>
    </button>
  );
  return (
    <Popover tieuDe="Loại nhà đất" onDong={dong} onDatLai={() => setChon([])}
      onApDung={() => { onApDung(chon.length === LOAI_MUA.length ? "" : chon.join(",")); dong(); }}>
      {dong1(chon.length === 0, "🏘️", "Tất cả nhà đất", () => setChon([]))}
      {LOAI_MUA.map(([k, ten, icon]) => dong1(chon.includes(k), icon, ten, () => doi(k), k))}
    </Popover>
  );
}

/** "Khoảng giá ▾" / "Diện tích ▾": 2 ô nhỏ nhất - lớn nhất + danh sách mốc (radio) */
export function PopKhoang({ loai, min, max, nhanDangAp, onApDung }: {
  loai: "gia" | "dt"; min: string; max: string; nhanDangAp: string;
  onApDung: (min: string, max: string) => void;
}) {
  return (
    <NutPop nhan={nhanDangAp || (loai === "gia" ? "Khoảng giá" : "Diện tích")} dangLoc={!!(min || max)}>
      {(dong) => <ThanKhoang loai={loai} min={min} max={max} dong={dong} onApDung={onApDung} />}
    </NutPop>
  );
}
// giá: người dùng gõ theo TỶ (1,5 = 1,5 tỷ), URL lưu VNĐ; diện tích gõ m²
const raHienThi = (loai: "gia" | "dt", v: string) => (!v ? "" : loai === "gia" ? String(Number(v) / 1e9).replace(".", ",") : v);
const vaoUrl = (loai: "gia" | "dt", v: string) => {
  const n = Number(v.replace(",", "."));
  if (!v.trim() || !Number.isFinite(n) || n <= 0) return "";
  return loai === "gia" ? String(Math.round(n * 1e9)) : String(Math.round(n));
};
function ThanKhoang({ loai, min, max, dong, onApDung }: {
  loai: "gia" | "dt"; min: string; max: string; dong: () => void; onApDung: (min: string, max: string) => void;
}) {
  const ds = loai === "gia" ? KHOANG_GIA_MUA : KHOANG_DT_MUA;
  const [a, setA] = useState(raHienThi(loai, min));
  const [b, setB] = useState(raHienThi(loai, max));
  const hienTai = `${vaoUrl(loai, a)}-${vaoUrl(loai, b)}`;
  const chonMoc = (v: string) => { const [x, y] = tachKhoang(v); setA(raHienThi(loai, x)); setB(raHienThi(loai, y)); };
  const donVi = loai === "gia" ? "tỷ" : "m²";
  const o = "h-11 w-full px-3 pr-10 rounded-lg border border-[var(--line-strong)] bg-[var(--surface)] text-sm outline-none focus:border-brand";
  return (
    <Popover tieuDe={loai === "gia" ? "Khoảng giá" : "Diện tích"} onDong={dong} onDatLai={() => { setA(""); setB(""); }}
      onApDung={() => {
        let x = vaoUrl(loai, a), y = vaoUrl(loai, b);
        if (x && y && Number(x) > Number(y)) [x, y] = [y, x]; // gõ ngược thì tự đảo
        onApDung(x, y); dong();
      }}>
      <div className="flex items-end gap-2 mb-3">
        <label className="flex-1 text-xs font-semibold">{loai === "gia" ? "Giá thấp nhất" : "Diện tích nhỏ nhất"}
          <span className="relative block mt-1.5">
            <input className={o} inputMode="decimal" placeholder="Từ" value={a} onChange={(e) => setA(e.target.value)} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--ink-faint)]">{donVi}</span>
          </span>
        </label>
        <span className="pb-3 text-[var(--ink-faint)]">→</span>
        <label className="flex-1 text-xs font-semibold">{loai === "gia" ? "Giá cao nhất" : "Diện tích lớn nhất"}
          <span className="relative block mt-1.5">
            <input className={o} inputMode="decimal" placeholder="Đến" value={b} onChange={(e) => setB(e.target.value)} />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--ink-faint)]">{donVi}</span>
          </span>
        </label>
      </div>
      <div role="radiogroup">
        {[["-", loai === "gia" ? "Tất cả khoảng giá" : "Tất cả diện tích"] as [string, string], ...ds].map(([v, l]) => {
          const on = v === hienTai;
          return (
            <button key={v} type="button" role="radio" aria-checked={on} onClick={() => chonMoc(v)}
              className="w-full flex items-center justify-between gap-3 py-2.5 text-sm text-left hover:text-brand">
              <span className={on ? "font-semibold text-brand" : ""}>{l}</span>
              <span className={oTron(on)} />
            </button>
          );
        })}
      </div>
    </Popover>
  );
}

/** Công tắc trong hàng lọc ("Tin đã xác minh", "Địa chỉ sau sáp nhập") - khung viền như nút, kiểu "Tin xác thực" */
export function CongTac({ bat, onDoi, icon, children, title }: {
  bat: boolean; onDoi: () => void; icon?: React.ReactNode; children: React.ReactNode; title?: string;
}) {
  return (
    <button type="button" role="switch" aria-checked={bat} onClick={onDoi} title={title}
      className={`shrink-0 h-10 pl-3 pr-2.5 rounded-lg border text-sm flex items-center gap-2 whitespace-nowrap transition
        ${bat ? "border-brand text-brand bg-brand/5 font-semibold" : "border-[var(--line-strong)] bg-[var(--surface)] text-[var(--ink-soft)] hover:border-brand"}`}>
      {icon}
      {children}
      <span className={`ml-1 w-10 h-6 rounded-full transition relative ${bat ? "bg-brand" : "bg-[var(--line-strong)]"}`}>
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${bat ? "left-5" : "left-1"}`} />
      </span>
    </button>
  );
}

/** Nhóm nút chọn 1 (Số phòng ngủ 1 2 3 4 5+, Hướng nhà...) trong popup "Lọc"; bấm lại = bỏ chọn */
export function NhomNut({ opts, value, onChange }: { opts: [string, string][]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {opts.map(([v, l]) => {
        const on = v === value;
        return (
          <button key={v} type="button" aria-pressed={on} onClick={() => onChange(on ? "" : v)}
            className={`h-9 min-w-11 px-3.5 rounded-full border text-sm transition
              ${on ? "border-brand bg-brand/5 text-brand font-semibold" : "border-[var(--line)] bg-[var(--surface)] hover:border-brand"}`}>
            {l}
          </button>
        );
      })}
    </div>
  );
}

/** Cột phải (lg+): "Lọc theo khoảng giá" + "Lọc theo diện tích" - bấm là lọc, bấm lại mục đang chọn = bỏ */
export function SidebarKhoang({ gia, dt, onGia, onDt }: {
  gia: string; dt: string; onGia: (v: string) => void; onDt: (v: string) => void;
}) {
  const khoi = (tieuDe: string, ds: [string, string][], dang: string, chon: (v: string) => void) => (
    <div className="card rounded-xl p-2">
      <h2 className="font-bold text-sm px-3 pt-2 pb-1.5">{tieuDe}</h2>
      {ds.map(([v, l]) => (
        <button key={v} type="button" onClick={() => chon(v === dang ? "" : v)}
          className={`w-full px-3 py-1.5 rounded-md text-left text-sm transition ${v === dang ? "bg-brand/10 text-brand font-semibold" : "text-[var(--ink-soft)] hover:bg-[var(--surface-2)] hover:text-[var(--ink)]"}`}>
          {l}
        </button>
      ))}
    </div>
  );
  return (
    <>
      {khoi("Lọc theo khoảng giá", KHOANG_GIA_MUA, gia, onGia)}
      {khoi("Lọc theo diện tích", KHOANG_DT_MUA, dt, onDt)}
    </>
  );
}
