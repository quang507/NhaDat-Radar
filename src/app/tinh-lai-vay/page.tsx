"use client";

import { useMemo, useState } from "react";

const VND = new Intl.NumberFormat("vi-VN");
function money(v: number): string {
  if (!Number.isFinite(v)) return "—";
  return VND.format(Math.round(v)) + " ₫";
}

const TIPS: [string, string][] = [
  ["Tỷ lệ vay an toàn", "Ngân hàng thường cho vay tối đa 70-80% giá trị nhà; khoản trả hàng tháng không nên vượt 40% thu nhập."],
  ["Lãi suất ưu đãi", "Nhiều ngân hàng có lãi ưu đãi 1-2 năm đầu rồi thả nổi — hãy tính theo lãi suất thả nổi để không bị động."],
  ["Trả trước hạn", "Hỏi rõ phí trả nợ trước hạn (thường 1-3% số tiền trả trước trong các năm đầu)."],
  ["So sánh nhiều ngân hàng", "Chênh 0.5%/năm trên khoản vay 2 tỷ trong 20 năm là hàng trăm triệu đồng — luôn so sánh ít nhất 3 ngân hàng."],
];

// Máy tính thế chấp: gốc + lãi trả đều (annuity) — chuẩn cách ngân hàng VN tính "trả góp đều".
export default function MortgagePage() {
  const [price, setPrice] = useState(3_000_000_000);
  const [downPct, setDownPct] = useState(30);
  const [rate, setRate] = useState(9.5);
  const [years, setYears] = useState(20);

  const r = useMemo(() => {
    const loan = Math.max(0, price * (1 - downPct / 100));
    const n = years * 12;
    const i = rate / 100 / 12;
    const monthly = i > 0 ? (loan * i) / (1 - Math.pow(1 + i, -n)) : loan / Math.max(1, n);
    const total = monthly * n;
    // Dư nợ còn lại cuối mỗi năm (cho biểu đồ)
    const balances: number[] = [];
    let bal = loan;
    for (let m = 1; m <= n; m++) {
      bal = bal * (1 + i) - monthly;
      if (m % 12 === 0) balances.push(Math.max(0, bal));
    }
    return { loan, monthly, total, interest: total - loan, balances, down: price - loan };
  }, [price, downPct, rate, years]);

  // Biểu đồ SVG dư nợ theo năm
  const W = 560, H = 200, PAD = 8;
  const maxY = Math.max(r.loan, 1);
  const pts = [r.loan, ...r.balances];
  const path = pts
    .map((v, i) => {
      const x = PAD + (i / Math.max(1, pts.length - 1)) * (W - PAD * 2);
      const y = PAD + (1 - v / maxY) * (H - PAD * 2);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  const num = (fn: (v: number) => void) => (e: React.ChangeEvent<HTMLInputElement>) =>
    fn(Number(e.target.value) || 0);

  return (
    <div>
      <section className="text-center py-8">
        <h1 className="prata text-3xl mb-3">Máy Tính Lãi Vay Mua Nhà</h1>
        <p className="text-[var(--ink-soft)] max-w-2xl mx-auto">
          Tính khoản thanh toán hàng tháng và xác định khả năng chi trả của bạn trước khi quyết định.
        </p>
      </section>

      <div className="grid gap-5 lg:grid-cols-[380px_1fr] items-start">
        {/* Nhập liệu */}
        <div className="card rounded-2xl p-5 shadow-sm">
          <h2 className="font-bold mb-4">Thông tin khoản vay</h2>
          <label className="block mb-3">
            <span className="block text-xs font-semibold mb-1 text-[var(--ink-soft)]">Giá trị bất động sản (VND)</span>
            <input className="inp" type="number" min={0} step={100_000_000} value={price} onChange={num(setPrice)} />
            <span className="text-xs text-brand font-semibold">{money(price)}</span>
          </label>
          <label className="block mb-3">
            <span className="block text-xs font-semibold mb-1 text-[var(--ink-soft)]">Trả trước: {downPct}% ({money(r.down)})</span>
            <input className="w-full accent-[var(--brand)]" type="range" min={10} max={90} step={5} value={downPct} onChange={num(setDownPct)} />
          </label>
          <label className="block mb-3">
            <span className="block text-xs font-semibold mb-1 text-[var(--ink-soft)]">Lãi suất (%/năm)</span>
            <input className="inp" type="number" min={0} max={30} step={0.1} value={rate} onChange={num(setRate)} />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold mb-1 text-[var(--ink-soft)]">Thời hạn vay: {years} năm</span>
            <input className="w-full accent-[var(--brand)]" type="range" min={5} max={35} step={5} value={years} onChange={num(setYears)} />
          </label>
        </div>

        {/* Kết quả */}
        <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="card rounded-2xl p-5 border-brand/40 bg-brand/5">
              <div className="text-xs font-semibold text-[var(--ink-soft)] mb-1">Thanh toán hàng tháng</div>
              <div className="text-2xl font-extrabold text-brand">{money(r.monthly)}</div>
            </div>
            <div className="card rounded-2xl p-5">
              <div className="text-xs font-semibold text-[var(--ink-soft)] mb-1">Số tiền vay</div>
              <div className="text-2xl font-extrabold">{money(r.loan)}</div>
            </div>
            <div className="card rounded-2xl p-5">
              <div className="text-xs font-semibold text-[var(--ink-soft)] mb-1">Tổng lãi phải trả</div>
              <div className="text-2xl font-extrabold text-amber-600">{money(r.interest)}</div>
            </div>
            <div className="card rounded-2xl p-5">
              <div className="text-xs font-semibold text-[var(--ink-soft)] mb-1">Tổng gốc + lãi</div>
              <div className="text-2xl font-extrabold">{money(r.total)}</div>
            </div>
          </div>

          <div className="card rounded-2xl p-5">
            <h3 className="font-bold mb-1">Dư nợ còn lại theo năm</h3>
            <p className="text-xs text-[var(--ink-soft)] mb-3">
              Khoản vay {money(r.loan)} giảm dần về 0 sau {years} năm.
            </p>
            <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
              <path d={`${path} L${W - PAD},${H - PAD} L${PAD},${H - PAD} Z`} fill="var(--brand)" opacity={0.12} />
              <path d={path} fill="none" stroke="var(--brand)" strokeWidth={2.5} strokeLinejoin="round" />
              <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="var(--line-strong)" />
            </svg>
            <div className="flex justify-between text-[0.65rem] text-[var(--ink-faint)] mt-1">
              <span>Năm 0</span><span>Năm {Math.round(years / 2)}</span><span>Năm {years}</span>
            </div>
          </div>
        </div>
      </div>

      <section className="mt-10">
        <h2 className="prata text-xl mb-4">Mẹo vay mua nhà</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {TIPS.map(([t, d]) => (
            <div key={t} className="card rounded-2xl p-5">
              <h3 className="font-bold mb-1">💡 {t}</h3>
              <p className="text-sm text-[var(--ink-soft)]">{d}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-[var(--ink-faint)] mt-4">
          * Kết quả chỉ mang tính tham khảo theo phương thức trả góp đều (annuity), không phải đề nghị cho vay.
        </p>
      </section>
    </div>
  );
}
