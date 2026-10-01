"use client";

import { useEffect, useRef, useState } from "react";
import { TIEN_ICH } from "@/lib/tien-ich";
import { toaDoTuLink } from "@/lib/maps-link";

// Các mảnh bộ lọc trang tìm kiếm dựng theo giao diện EvoHome (1/10): hàng tick tiện ích, ô chọn dự án,
// chip tỉnh + dải chip quận, ô khoảng cách theo link Google Maps. SearchClient ghép lại + giữ state.

const tachTi = (s: string) => s.split(",").filter(Boolean);
export const doiTi = (s: string, k: string) => {
  const a = tachTi(s);
  return (a.includes(k) ? a.filter((x) => x !== k) : [...a, k]).join(",");
};

/** "Tiện ích: [☐ Điều hòa] [☐ Nước nóng] ..." - tick là lọc ngay */
export function HangTienIch({ ti, onDoi }: { ti: string; onDoi: (k: string) => void }) {
  const chon = tachTi(ti);
  return (
    <div className="flex items-start gap-2 mb-3">
      <span className="hidden sm:block text-xs font-semibold text-[var(--ink-soft)] pt-2 shrink-0">Tiện ích:</span>
      <div className="flex gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible -mx-5 px-5 sm:mx-0 sm:px-0 pb-1 [scrollbar-width:none]">
        {TIEN_ICH.map((t) => {
          const on = chon.includes(t.k);
          return (
            <button key={t.k} type="button" role="checkbox" aria-checked={on} onClick={() => onDoi(t.k)}
              className={`shrink-0 flex items-center gap-2 h-9 pl-2.5 pr-4 rounded-full border text-sm whitespace-nowrap transition
                ${on ? "border-brand bg-brand/5 text-brand font-semibold" : "border-[var(--line)] bg-[var(--surface)] hover:border-brand"}`}>
              <span className={`grid place-items-center w-4 h-4 rounded border text-[0.65rem] leading-none
                ${on ? "bg-brand border-brand text-white" : "border-[var(--line-strong)]"}`}>{on ? "✓" : ""}</span>
              {t.ten}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** "Dự án: [🔍 Chọn dự án...]" - gõ để lọc danh sách, chọn là áp ngay */
export function ChonDuAn({ duAn, value, onChon }: { duAn: { id: string; name: string }[]; value: string; onChon: (id: string) => void }) {
  const [mo, setMo] = useState(false);
  const [go, setGo] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!mo) return;
    const dong = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setMo(false); };
    document.addEventListener("mousedown", dong);
    return () => document.removeEventListener("mousedown", dong);
  }, [mo]);
  const dangChon = duAn.find((d) => d.id === value);
  const boDau = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase();
  const loc = duAn.filter((d) => boDau(d.name).includes(boDau(go))).slice(0, 50);
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-xs font-semibold text-[var(--ink-soft)] shrink-0">Dự án:</span>
      <div className="relative w-full sm:w-72" ref={ref}>
        {dangChon ? (
          <button type="button" onClick={() => onChon("")} title="Bỏ chọn dự án"
            className="h-10 w-full px-3 rounded-lg border border-brand bg-brand/5 text-brand text-sm font-semibold flex items-center gap-2">
            <span className="truncate">{dangChon.name}</span><span className="ml-auto" aria-hidden>✕</span>
          </button>
        ) : (
          <label className="h-10 w-full px-3 rounded-lg bg-[var(--surface)] border border-[var(--line)] flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-[var(--ink-soft)] shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden><circle cx="9" cy="9" r="5.5" /><path d="M13.5 13.5L17 17" strokeLinecap="round" /></svg>
            <input className="flex-1 min-w-0 bg-transparent outline-none" placeholder="Chọn dự án..." value={go}
              onFocus={() => setMo(true)} onChange={(e) => { setGo(e.target.value); setMo(true); }} />
          </label>
        )}
        {mo && !dangChon && (
          <ul className="absolute left-0 top-full mt-1 z-50 w-full max-h-72 overflow-y-auto rounded-lg border border-[var(--line)] bg-[var(--surface)] shadow-lg py-1 text-sm">
            {loc.length ? loc.map((d) => (
              <li key={d.id}>
                <button type="button" className="w-full text-left px-3 py-2 hover:bg-[var(--line)]/40" onClick={() => { onChon(d.id); setMo(false); setGo(""); }}>{d.name}</button>
              </li>
            )) : <li className="px-3 py-2 text-[var(--ink-soft)]">Không có dự án khớp</li>}
          </ul>
        )}
      </div>
    </div>
  );
}

const tenGon = (d: string) => d.replace(/^Quận (\d+)$/, "Q.$1").replace(/^(Quận|Huyện|Thị xã|Thành phố) (?=\D)/, "");

/** Chip tỉnh ("Hồ Chí Minh ✕") + công tắc địa chỉ mới, rồi dải chip quận cuộn ngang có "Xem thêm" */
export function KhuVucChip({ tinhs, province, districts, district, onTinh, onQuan, phai }: {
  tinhs: string[]; province: string; districts: string[]; district: string;
  onTinh: (p: string) => void; onQuan: (d: string) => void; phai?: React.ReactNode;
}) {
  const [du, setDu] = useState(false);
  const pill = (on: boolean) => `shrink-0 h-9 px-3.5 rounded-full text-sm font-semibold whitespace-nowrap flex items-center gap-2 transition
    ${on ? "bg-brand text-white" : "bg-[var(--surface)] border border-[var(--line)] hover:border-brand"}`;
  return (
    <div className="mb-3">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        {province ? (
          <button type="button" className={pill(true)} onClick={() => onTinh("")} title="Bỏ chọn tỉnh">{province} <span aria-hidden>✕</span></button>
        ) : tinhs.slice(0, 8).map((p) => (
          <button key={p} type="button" className={pill(false)} onClick={() => onTinh(p)}>{p}</button>
        ))}
        {phai && <span className="ml-auto flex flex-wrap items-center gap-4">{phai}</span>}
      </div>
      {province && districts.length > 0 && (
        <div className="card rounded-xl p-2 flex items-start gap-2">
          <div className={`flex gap-2 flex-1 min-w-0 ${du ? "flex-wrap" : "overflow-x-auto [scrollbar-width:thin] pb-1"}`}>
            {districts.map((d) => (
              <button key={d} type="button" onClick={() => onQuan(d === district ? "" : d)}
                className={`shrink-0 h-8 px-3.5 rounded-full text-sm whitespace-nowrap transition
                  ${d === district ? "bg-brand text-white font-semibold" : "border border-[var(--line)] bg-[var(--surface)] hover:border-brand"}`}>
                {tenGon(d)}
              </button>
            ))}
          </div>
          {districts.length > 8 && (
            <button type="button" onClick={() => setDu((v) => !v)}
              className="shrink-0 h-8 px-3 rounded-full bg-brand/10 text-brand text-sm font-semibold whitespace-nowrap">
              {du ? "Thu gọn ▴" : "Xem thêm ▾"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** Ô "Dán link Google Maps..." + nút 🔍 -> toạ độ; link rút gọn thì hỏi /api/toa-do */
export function OKhoangCach({ gan, bk, onDoi }: { gan: string; bk: string; onDoi: (gan: string, bk: string) => void }) {
  const [link, setLink] = useState("");
  const [loi, setLoi] = useState("");
  const [dang, setDang] = useState(false);
  async function tim() {
    setLoi("");
    const s = link.trim();
    if (!s) return;
    let td = toaDoTuLink(s);
    if (!td) {
      setDang(true);
      try {
        const r = await fetch(`/api/toa-do?url=${encodeURIComponent(s)}`);
        const j = await r.json();
        if (r.ok && typeof j.lat === "number") td = { lat: j.lat, lng: j.lng };
        else setLoi(j.loi || "Không đọc được toạ độ từ link");
      } catch { setLoi("Lỗi mạng, thử lại"); }
      setDang(false);
    }
    if (td) { onDoi(`${td.lat.toFixed(6)},${td.lng.toFixed(6)}`, bk || "2"); setLink(""); }
  }
  return (
    <div>
      <div className="flex gap-2">
        <input className="inp flex-1" value={link} onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); tim(); } }}
          placeholder="Dán link Google Maps..." />
        <button type="button" onClick={tim} disabled={dang} aria-label="Lấy vị trí từ link"
          className="w-11 shrink-0 rounded-lg bg-brand text-white grid place-items-center hover:bg-brand-ink disabled:opacity-60">
          {dang ? "…" : <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="9" cy="9" r="5.5" /><path d="M13.5 13.5L17 17" strokeLinecap="round" /></svg>}
        </button>
      </div>
      {loi && <p className="text-xs text-red-600 mt-1">{loi}</p>}
      {gan && (
        <div className="flex flex-wrap items-center gap-2 mt-2 text-sm">
          <span className="px-2.5 py-1 rounded-full bg-brand/10 text-brand font-semibold">📍 {gan}</span>
          <span className="text-[var(--ink-soft)]">trong bán kính</span>
          <select className="inp !w-auto !py-1" value={bk || "2"} onChange={(e) => onDoi(gan, e.target.value)}>
            {["0.5", "1", "2", "3", "5", "10", "20"].map((k) => <option key={k} value={k}>{k.replace(".", ",")} km</option>)}
          </select>
          <button type="button" className="text-xs text-[var(--ink-soft)] underline" onClick={() => onDoi("", "")}>Bỏ</button>
        </div>
      )}
    </div>
  );
}
