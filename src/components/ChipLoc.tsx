"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";

// Chip lọc xổ xuống (1/10, kiểu EvoHome): nút viền bo tròn, đang lọc thì viền + chữ màu brand,
// kèm badge số; menu tự vẽ có dấu ✓ ở mục đang chọn. Thay các <select> trần ở hàng lọc nhanh
// (list option của <select> do HĐH vẽ, không ăn CSS - xem ChonSapXep).
export default function ChipLoc({
  label, options, value, onChange, badge,
}: {
  label: string;                    // nhãn khi chưa chọn gì ("Khoảng giá")
  options: [string, string][];      // [value, nhãn]; value "" = mục "Tất cả"
  value: string;
  onChange: (v: string) => void;
  badge?: boolean;                  // hiện badge "1" khi đang lọc (kiểu "Giá thuê ①")
}) {
  const [mo, setMo] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mo) return;
    const dongNgoai = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setMo(false); };
    const dongEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setMo(false); };
    document.addEventListener("mousedown", dongNgoai);
    document.addEventListener("keydown", dongEsc);
    return () => { document.removeEventListener("mousedown", dongNgoai); document.removeEventListener("keydown", dongEsc); };
  }, [mo]);

  const dangLoc = !!value;
  // có badge thì nút giữ nhãn gốc ("Giá thuê ①"), không thì hiện mục đang chọn ("Căn hộ")
  const nhan = dangLoc && !badge ? options.find(([v]) => v === value)?.[1] ?? label : label;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className={`h-10 px-4 rounded-lg border text-sm flex items-center gap-2 whitespace-nowrap transition
          ${dangLoc || mo ? "border-brand text-brand bg-brand/5" : "border-[var(--line-strong)] bg-[var(--surface)] hover:border-brand"}`}
        aria-haspopup="listbox"
        aria-expanded={mo}
        onClick={() => setMo((v) => !v)}
      >
        {nhan}
        {dangLoc && badge && <span className="grid place-items-center w-5 h-5 rounded-full bg-brand text-white text-[0.7rem] font-bold">1</span>}
        <svg className={`w-4 h-4 transition-transform ${mo ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {mo && (
        <ul
          role="listbox"
          className="absolute left-0 top-full mt-1 z-50 min-w-[12rem] max-h-80 overflow-y-auto rounded-lg border border-[var(--line)] bg-[var(--surface)] shadow-lg py-1 text-sm"
        >
          {options.map(([v, l]) => (
            <li key={v} role="option" aria-selected={v === value}>
              <button
                type="button"
                className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-4 hover:bg-[var(--line)]/40 ${v === value ? "font-semibold" : ""}`}
                onClick={() => { onChange(v); setMo(false); }}
              >
                {l}
                {v === value && <Check className="w-4 h-4 text-brand shrink-0" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
