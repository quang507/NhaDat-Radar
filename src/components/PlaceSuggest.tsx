"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { stripAccents } from "@/lib/slug";
import type { Place } from "@/lib/goi-y-noi";
export { buildPlaces, type Place } from "@/lib/goi-y-noi";

// NN/g #5 (phòng lỗi): gợi ý địa danh khi gõ vào ô tìm - khớp không dấu, viết tắt "Q7"/"q.7"/"quan 7" -> "Quận 7 · Hồ Chí Minh",
// "bt" không đoán (quá mơ hồ). Nguồn gợi ý = cây Tỉnh -> Quận -> Phường thật từ DB (đã truyền cho SearchClient).
// 28/10 (anh Quang): gõ SAI chính tả ("go vapp", "bihn thanh", "tan bnh") vẫn xổ tên quận đúng - khớp gần đúng
// theo khoảng cách sửa chữ, chỉ cho tỉnh/quận (phường quá nhiều tên giống nhau -> gợi ý nhiễu).

const norm = (s: string) => stripAccents(s).replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
// "q7" / "q.7" / "quan7" -> "quan 7"; "p3" -> "phuong 3"; "tp thu duc" -> "tp thu duc"
const expand = (q: string) => norm(q).replace(/^q\.?\s*(\d{1,2})$/, "quan $1").replace(/^quan(\d{1,2})$/, "quan $1").replace(/^p\.?\s*(\d{1,2})$/, "phuong $1").replace(/^h\.?\s+/, "huyen ");
// phần tên riêng: bỏ tiền tố hành chính để "quan go vap" và "go vapp" so được với nhau
const loi = (s: string) => s.replace(/^(quan|huyen|thi xa|thanh pho|tp|tinh|phuong|xa|thi tran)\s+/, "");

/** Khoảng cách sửa chữ (thêm/bớt/thay/đảo 2 chữ kề) - dừng sớm khi đã vượt `tran` */
function khoangCach(a: string, b: string, tran: number): number {
  if (Math.abs(a.length - b.length) > tran) return tran + 1;
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    let minDong = Infinity;
    for (let j = 1; j <= b.length; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + c);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      minDong = Math.min(minDong, d[i][j]);
    }
    if (minDong > tran) return tran + 1;
  }
  return d[a.length][b.length];
}

/** Gõ gần đúng tên tỉnh/quận? Cho sai 1 chữ (tên ngắn) hoặc 2 chữ (từ 7 ký tự); đang gõ dở thì so với phần đầu tên */
function ganDung(q: string, label: string): boolean {
  const a = loi(q), b = loi(label);
  if (a.length < 3) return false;
  const tran = a.replace(/ /g, "").length >= 7 ? 2 : 1;
  if (khoangCach(a, b, tran) <= tran) return true;
  if (khoangCach(a.replace(/ /g, ""), b.replace(/ /g, ""), tran) <= tran) return true;   // "binhthanh"
  return a.length >= 4 && a.length < b.length && khoangCach(a, b.slice(0, a.length), tran) <= tran;   // "bihn th"
}


// Dự án (26/10): gợi ý thêm từ /api/goi-y-du-an (~2.200 dự án, lọc ở server) - chọn là tìm tin QUANH dự án
export type DuAnGoiY = { id: string; name: string; sub: string; lat: number; lng: number };

export default function PlaceSuggest({ value, places, onPick, onPickDuAn, className, inputRef }: {
  value: string; places: Place[]; onPick: (p: Place) => void; onPickDuAn?: (d: DuAnGoiY) => void; className?: string;
  /** ô nhập đi kèm: có thì bật phím ↑ ↓ Enter Esc để chọn gợi ý */
  inputRef?: RefObject<HTMLInputElement | null>;
}) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  // Enter chỉ chọn gợi ý khi khách ĐÃ dùng phím mũi tên - không thì Enter vẫn tìm theo chữ gõ ("Quang Trung" là tên đường)
  const [daDungPhim, setDaDungPhim] = useState(false);
  const [duAn, setDuAn] = useState<DuAnGoiY[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);
  const q = expand(value);
  // gõ dừng 250ms mới hỏi server; huỷ yêu cầu cũ khi gõ tiếp
  useEffect(() => {
    if (!onPickDuAn || q.length < 2) { setDuAn([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      fetch(`/api/goi-y-du-an?q=${encodeURIComponent(value.trim())}`, { signal: ctrl.signal })
        .then((r) => (r.ok ? r.json() : [])).then((d: DuAnGoiY[]) => setDuAn(Array.isArray(d) ? d.slice(0, 4) : []))
        .catch(() => { /* huỷ / lỗi mạng: bỏ qua gợi ý dự án */ });
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q, value, onPickDuAn]);
  const { hits, chiGanDung } = useMemo(() => {
    if (q.length < 1) return { hits: [] as Place[], chiGanDung: false };
    const scored = places.map((p) => {
      const l = norm(p.label);
      let s = l === q ? 30 : l.startsWith(q) ? 20 : l.includes(q) ? 10 : 0;
      if (!s && p.level !== "ward" && ganDung(q, l)) s = 5;
      // "quan 7" không được khớp "quan 70"/"quan 72" trước "quan 7" -> ưu tiên exact/prefix + level cao
      return { p, s: s ? s + (p.level === "province" ? 3 : p.level === "district" ? 2 : 1) : 0 };
    }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s || a.p.label.length - b.p.label.length);
    const top = scored.slice(0, duAn.length ? 4 : 7);
    return { hits: top.map((x) => x.p), chiGanDung: top.length > 0 && top.every((x) => x.s < 10) };
  }, [q, places, duAn.length]);
  useEffect(() => { setOpen(hits.length > 0 || duAn.length > 0); setHi(0); setDaDungPhim(false); }, [hits, duAn, value]);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node) && e.target !== inputRef?.current) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, [inputRef]);

  const tong = hits.length + (onPickDuAn ? duAn.length : 0);
  const chon = (i: number) => {
    if (i < hits.length) onPick(hits[i]); else if (onPickDuAn && duAn[i - hits.length]) onPickDuAn(duAn[i - hits.length]);
    setOpen(false);
  };
  useEffect(() => {
    const o = inputRef?.current; if (!o) return;
    const phim = (e: KeyboardEvent) => {
      if (!open || !tong) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault(); setDaDungPhim(true);
        setHi((h) => (daDungPhim ? (h + (e.key === "ArrowDown" ? 1 : -1) + tong) % tong : e.key === "ArrowDown" ? 0 : tong - 1));
      } else if (e.key === "Enter" && daDungPhim) { e.preventDefault(); chon(hi); }
      else if (e.key === "Escape") setOpen(false);
    };
    o.addEventListener("keydown", phim); return () => o.removeEventListener("keydown", phim);
  });

  if (!open || (!hits.length && !duAn.length)) return null;
  const sang = (i: number) => (daDungPhim && i === hi) || (!inputRef && i === hi);
  return (
    <div ref={boxRef} className={`absolute z-30 left-0 right-0 top-full mt-1 card rounded-lg shadow-lg overflow-hidden ${className || ""}`} role="listbox">
      {chiGanDung && <div className="px-3 pt-2 pb-1 text-caption text-[var(--ink-faint)]">Có phải bạn muốn tìm:</div>}
      {hits.map((p, i) => (
        <button
          key={`${p.level}|${p.province}|${p.district || ""}|${p.ward || ""}`}
          type="button" role="option" aria-selected={sang(i)}
          onMouseEnter={() => setHi(i)}
          onMouseDown={(e) => { e.preventDefault(); chon(i); }}
          onClick={(e) => { e.preventDefault(); chon(i); }}
          className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 min-h-[44px] hover:bg-[var(--surface-2)] ${sang(i) ? "bg-[var(--surface-2)]" : ""}`}
        >
          <span className="text-[var(--ink-faint)] text-xs w-14 shrink-0">{p.level === "province" ? "Tỉnh/TP" : p.level === "district" ? "Quận" : "Phường"}</span>
          <span className="font-semibold">{p.label}</span>
          <span className="text-xs text-[var(--ink-soft)] truncate">{p.sub}</span>
        </button>
      ))}
      {duAn.length > 0 && onPickDuAn && (
        <>
          <div className="px-3 pt-2 pb-1 text-overline uppercase text-[var(--ink-faint)] border-t border-[var(--line)]">Tìm quanh dự án</div>
          {duAn.map((d, j) => (
            <button
              key={d.id} type="button" role="option" aria-selected={sang(hits.length + j)}
              onMouseDown={(e) => { e.preventDefault(); chon(hits.length + j); }}
              onClick={(e) => { e.preventDefault(); chon(hits.length + j); }}
              className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 min-h-[44px] hover:bg-[var(--surface-2)] ${sang(hits.length + j) ? "bg-[var(--surface-2)]" : ""}`}
            >
              <span className="text-[var(--ink-faint)] text-xs w-14 shrink-0">Dự án</span>
              <span className="font-semibold truncate">{d.name}</span>
              <span className="text-xs text-[var(--ink-soft)] truncate">{d.sub}</span>
            </button>
          ))}
        </>
      )}
    </div>
  );
}
