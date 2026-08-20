"use client";

import { useEffect, useRef, useState } from "react";

// Dropdown sắp xếp TỰ VẼ thay cho <select> trần (20/8, người dùng chê "UI xổ xuống chưa ok"):
// danh sách option của <select> do trình duyệt/HĐH vẽ, không nhận CSS của web nên lạc quẻ
// hẳn với giao diện. Component này ~60 dòng React thuần, không thêm thư viện - phần "nặng"
// duy nhất là một listener click-ngoài, gắn khi mở và gỡ khi đóng.
export default function ChonSapXep({
  options, value, onChange,
}: {
  options: [string, string][]; value: string; onChange: (v: string) => void;
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

  const nhan = options.find(([v]) => v === value)?.[1] ?? options[0]?.[1] ?? "";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="inp !w-auto text-sm cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
        aria-haspopup="listbox"
        aria-expanded={mo}
        onClick={() => setMo((v) => !v)}
      >
        {nhan}
        <span className={`text-[0.6rem] transition-transform ${mo ? "rotate-180" : ""}`}>▼</span>
      </button>

      {mo && (
        <ul
          role="listbox"
          className="absolute right-0 top-full mt-1 z-50 min-w-[13rem] rounded-lg border border-[var(--line)] bg-[var(--bg,#fff)] shadow-lg py-1 text-sm"
        >
          {options.map(([v, l]) => (
            <li key={v} role="option" aria-selected={v === value}>
              <button
                type="button"
                className={`w-full text-left px-3 py-2 flex items-center justify-between gap-3 hover:bg-[var(--line)]/40 ${v === value ? "font-bold text-brand" : ""}`}
                onClick={() => { onChange(v); setMo(false); }}
              >
                {l}
                {v === value && <span aria-hidden>✓</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
