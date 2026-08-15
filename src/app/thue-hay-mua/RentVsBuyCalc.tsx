"use client";

import { useMemo, useState } from "react";

const VND = new Intl.NumberFormat("vi-VN");
const money = (v: number) => (v >= 1e9 ? (v / 1e9).toFixed(2).replace(/\.?0+$/, "") + " tỷ" : VND.format(Math.round(v)) + " ₫");

// So sánh đơn giản trong N năm: THUÊ (tiền thuê tăng nhẹ + tiền dư đem gửi) vs MUA (trả góp + nhà tăng giá).
export default function RentVsBuyCalc() {
  const [price, setPrice] = useState(3_000_000_000);
  const [rent, setRent] = useState(10_000_000);
  const [downPct, setDownPct] = useState(30);
  const [rate, setRate] = useState(9.5);
  const [years, setYears] = useState(10);
  const [growth, setGrowth] = useState(5);

  const r = useMemo(() => {
    const loan = price * (1 - downPct / 100);
    const n = 20 * 12; // vay 20 năm
    const i = rate / 100 / 12;
    const monthly = i > 0 ? (loan * i) / (1 - Math.pow(1 + i, -n)) : loan / n;

    // MUA: trả trước + góp trong <years> năm, cuối kỳ còn nợ -> trừ; nhà tăng giá growth%/năm
    let bal = loan;
    for (let m = 0; m < years * 12; m++) bal = bal * (1 + i) - monthly;
    const homeValue = price * Math.pow(1 + growth / 100, years);
    const buyNet = homeValue - Math.max(0, bal) - (price * downPct) / 100 - monthly * years * 12;

    // THUÊ: tiền thuê tăng 5%/năm; khoản chênh (trả trước + góp - thuê) gửi tiết kiệm 5%/năm
    let rentPaid = 0, saved = (price * downPct) / 100, mRent = rent;
    for (let m = 0; m < years * 12; m++) {
      rentPaid += mRent;
      saved = saved * (1 + 0.05 / 12) + Math.max(0, monthly - mRent);
      if ((m + 1) % 12 === 0) mRent *= 1.05;
    }
    const rentNet = saved - (price * downPct) / 100 - Math.max(0, monthly - rent) * years * 12;

    return { monthly, buyNet, rentNet, better: buyNet > rentNet ? "mua" : "thue" };
  }, [price, rent, downPct, rate, years, growth]);

  const num = (fn: (v: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) => fn(Number(e.target.value) || 0);

  return (
    <div className="card rounded-lg p-5">
      <h2 className="font-bold mb-4">⚖️ Máy so sánh Thuê vs Mua</h2>
      <div className="grid grid-cols-2 gap-3">
        <label className="block col-span-2">
          <span className="lbl">Giá nhà muốn mua: {money(price)}</span>
          <input className="w-full accent-[var(--brand)]" type="range" min={5e8} max={2e10} step={1e8} value={price} onChange={num(setPrice)} />
        </label>
        <label className="block col-span-2">
          <span className="lbl">Tiền thuê nhà tương đương: {money(rent)}/tháng</span>
          <input className="w-full accent-[var(--brand)]" type="range" min={2e6} max={1e8} step={1e6} value={rent} onChange={num(setRent)} />
        </label>
        <label className="block">
          <span className="lbl">Trả trước: {downPct}%</span>
          <input className="w-full accent-[var(--brand)]" type="range" min={10} max={90} step={5} value={downPct} onChange={num(setDownPct)} />
        </label>
        <label className="block">
          <span className="lbl">Lãi vay: {rate}%/năm</span>
          <input className="w-full accent-[var(--brand)]" type="range" min={5} max={15} step={0.5} value={rate} onChange={num(setRate)} />
        </label>
        <label className="block">
          <span className="lbl">Thời gian so sánh: {years} năm</span>
          <input className="w-full accent-[var(--brand)]" type="range" min={3} max={20} step={1} value={years} onChange={num(setYears)} />
        </label>
        <label className="block">
          <span className="lbl">Nhà tăng giá: {growth}%/năm</span>
          <input className="w-full accent-[var(--brand)]" type="range" min={0} max={15} step={1} value={growth} onChange={num(setGrowth)} />
        </label>
      </div>

      <div className={`mt-4 rounded-xl p-4 text-center border ${r.better === "mua" ? "border-brand/40 bg-brand/5" : "border-emerald-500/40 bg-emerald-500/5"}`}>
        <div className="text-sm text-[var(--ink-soft)] mb-1">Sau {years} năm, phương án có lợi hơn là</div>
        <div className={`text-2xl font-extrabold ${r.better === "mua" ? "text-brand" : "text-emerald-600"}`}>
          {r.better === "mua" ? "🏠 MUA NHÀ" : "🔑 THUÊ NHÀ"}
        </div>
        <div className="text-xs text-[var(--ink-soft)] mt-2">
          Góp hàng tháng nếu mua: <b>{money(r.monthly)}</b> · chênh lệch tài sản ròng ước tính:{" "}
          <b>{money(Math.abs(r.buyNet - r.rentNet))}</b>
        </div>
      </div>
      <p className="text-[0.68rem] text-[var(--ink-faint)] mt-2">
        * Mô hình giản lược (thuê tăng 5%/năm, tiền nhàn rỗi gửi 5%/năm, vay 20 năm) — chỉ tham khảo.
      </p>
    </div>
  );
}
