"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { stripAccents } from "@/lib/slug";

// NN/g #5 (phòng lỗi): gợi ý địa danh khi gõ vào ô tìm - khớp không dấu, viết tắt "Q7"/"q.7"/"quan 7" -> "Quận 7 · Hồ Chí Minh",
// "bt" không đoán (quá mơ hồ). Nguồn gợi ý = cây Tỉnh -> Quận -> Phường thật từ DB (đã truyền cho SearchClient).
export type Place = { level: "province" | "district" | "ward"; province: string; district?: string; ward?: string; label: string; sub: string };

const norm = (s: string) => stripAccents(s).replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
// "q7" / "q.7" / "quan7" -> "quan 7"; "p3" -> "phuong 3"; "tp thu duc" -> "tp thu duc"
const expand = (q: string) => norm(q).replace(/^q\.?\s*(\d{1,2})$/, "quan $1").replace(/^quan(\d{1,2})$/, "quan $1").replace(/^p\.?\s*(\d{1,2})$/, "phuong $1").replace(/^h\.?\s+/, "huyen ");

export function buildPlaces(geo: Record<string, Record<string, string[]>>): Place[] {
  const out: Place[] = [];
  for (const [p, ds] of Object.entries(geo)) {
    out.push({ level: "province", province: p, label: p, sub: "Tỉnh/Thành phố" });
    for (const [d, ws] of Object.entries(ds)) {
      out.push({ level: "district", province: p, district: d, label: d, sub: p });
      for (const w of ws) out.push({ level: "ward", province: p, district: d, ward: w, label: w, sub: `${d}, ${p}` });
    }
  }
  return out;
}

export default function PlaceSuggest({ value, places, onPick, className }: {
  value: string; places: Place[]; onPick: (p: Place) => void; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const q = expand(value);
  const hits = useMemo(() => {
    if (q.length < 1) return [];
    const scored = places.map((p) => {
      const l = norm(p.label);
      const s = l === q ? 3 : l.startsWith(q) ? 2 : l.includes(q) ? 1 : 0;
      // "quan 7" không được khớp "quan 70"/"quan 72" trước "quan 7" -> ưu tiên exact/prefix + level cao
      return { p, s: s ? s * 10 + (p.level === "province" ? 3 : p.level === "district" ? 2 : 1) : 0 };
    }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s || a.p.label.length - b.p.label.length);
    return scored.slice(0, 7).map((x) => x.p);
  }, [q, places]);
  useEffect(() => { setOpen(hits.length > 0); setHi(0); }, [hits, value]);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h); return () => document.removeEventListener("mousedown", h);
  }, []);
  if (!open || !hits.length) return null;
  return (
    <div ref={boxRef} className={`absolute z-30 left-0 right-0 top-full mt-1 card rounded-lg shadow-lg overflow-hidden ${className || ""}`} role="listbox">
      {hits.map((p, i) => (
        <button
          key={`${p.level}|${p.province}|${p.district || ""}|${p.ward || ""}`}
          type="button" role="option" aria-selected={i === hi}
          onMouseEnter={() => setHi(i)}
          onMouseDown={(e) => { e.preventDefault(); onPick(p); setOpen(false); }}
          className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 min-h-[44px] ${i === hi ? "bg-[var(--surface-2)]" : ""}`}
        >
          <span className="text-[var(--ink-faint)] text-xs w-14 shrink-0">{p.level === "province" ? "Tỉnh/TP" : p.level === "district" ? "Quận" : "Phường"}</span>
          <span className="font-semibold">{p.label}</span>
          <span className="text-xs text-[var(--ink-soft)] truncate">{p.sub}</span>
        </button>
      ))}
    </div>
  );
}
