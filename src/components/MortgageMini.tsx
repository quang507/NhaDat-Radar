"use client";

import { useState } from "react";
import Link from "next/link";

// Ước tính trả góp ngay trên tin (ISO 9241-110 "suitability for the task": quyết định tại chỗ, không rời trang).
// Mặc định: vay 70%, 8,5%/năm, 20 năm — người dùng kéo được. Công thức annuity chuẩn. Link sang /tinh-lai-vay để tính kỹ.
const fmt = (v: number) => (v >= 1e9 ? (v / 1e9).toFixed(2).replace(/\.?0+$/, "") + " tỷ" : Math.round(v / 1e6).toLocaleString("vi-VN") + " triệu");

export default function MortgageMini({ price }: { price: number }) {
  const [pct, setPct] = useState(70);
  const [rate, setRate] = useState(8.5);
  const [years, setYears] = useState(20);
  const loan = price * pct / 100;
  const r = rate / 100 / 12, n = years * 12;
  const monthly = r > 0 ? loan * r / (1 - Math.pow(1 + r, -n)) : loan / n;
  const firstInterest = loan * r;
  return (
    <div className="card rounded-lg p-4 text-sm">
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <h3 className="font-bold">Trả góp ước tính</h3>
        <Link href={`/tinh-lai-vay?price=${price}&pct=${pct}&rate=${rate}&years=${years}`} className="text-xs text-brand font-semibold">Tính chi tiết →</Link>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs">
        <label>Vay <b>{pct}%</b><input type="range" min={0} max={90} step={5} value={pct} onChange={(e) => setPct(+e.target.value)} className="w-full accent-[var(--brand)]" /></label>
        <label>Lãi <b>{rate}%</b>/năm<input type="range" min={5} max={14} step={0.5} value={rate} onChange={(e) => setRate(+e.target.value)} className="w-full accent-[var(--brand)]" /></label>
        <label><b>{years}</b> năm<input type="range" min={5} max={30} step={5} value={years} onChange={(e) => setYears(+e.target.value)} className="w-full accent-[var(--brand)]" /></label>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        <span>Trả trước <b>{fmt(price - loan)}</b></span>
        <span>Vay <b>{fmt(loan)}</b></span>
        <span className="text-brand">≈ <b>{fmt(monthly)}</b>/tháng</span>
        <span className="text-[var(--ink-faint)]">(tháng đầu lãi {fmt(firstInterest)})</span>
      </div>
      <p className="text-[0.68rem] text-[var(--ink-faint)] mt-1">Gốc + lãi đều theo dư nợ gốc ban đầu (annuity). Lãi thực tế theo ngân hàng, thường ưu đãi 1–2 năm đầu rồi thả nổi.</p>
    </div>
  );
}
