"use client";

import { useState } from "react";
import Link from "next/link";
import { PROP } from "@/lib/format";

const VND = new Intl.NumberFormat("vi-VN");
function money(v: number, monthly = false): string {
  if (v >= 1e9) return (v / 1e9).toFixed(v % 1e9 ? 2 : 0).replace(/\.?0+$/, "") + " tỷ" + (monthly ? "/th" : "");
  if (v >= 1e6) return Math.round(v / 1e6) + " triệu" + (monthly ? "/th" : "");
  return VND.format(v) + " ₫";
}

type Result = {
  estimate_vnd: number; low_vnd: number; high_vnd: number;
  confidence: "thap" | "trung_binh" | "cao"; reasoning: string;
  forecast_pct: { y1: number; y3: number; y5: number };
  comps: { count: number; scope: string; median_ppm2: number; p25_ppm2: number | null; p75_ppm2: number | null };
  deal: "ban" | "cho_thue";
};

const CONF: Record<string, [string, string]> = {
  cao: ["Độ tin cậy cao", "text-emerald-600 bg-emerald-500/10 border-emerald-500/30"],
  trung_binh: ["Độ tin cậy trung bình", "text-amber-600 bg-amber-500/10 border-amber-500/30"],
  thap: ["Độ tin cậy thấp - ít tin so sánh", "text-red-600 bg-red-500/10 border-red-500/30"],
};

export default function ValuationClient({ geo }: { geo: Record<string, string[]> }) {
  const [f, setF] = useState({
    deal: "ban", kind: "nha", province: "", district: "",
    area_m2: "", bedrooms: "", floors: "", legal: "", note: "",
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [r, setR] = useState<Result | null>(null);

  const provinces = Object.keys(geo).sort();
  const districts = f.province ? geo[f.province] || [] : [];
  const monthly = f.deal === "cho_thue";

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setF((s) => (k === "province" ? { ...s, province: e.target.value, district: "" } : { ...s, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(""); setR(null);
    try {
      const res = await fetch("/api/valuation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...f,
          area_m2: Number(f.area_m2),
          bedrooms: f.bedrooms ? Number(f.bedrooms) : undefined,
          floors: f.floors ? Number(f.floors) : undefined,
        }),
      });
      const j = await res.json();
      if (!res.ok) setErr(j.error || "Có lỗi xảy ra, thử lại nhé.");
      else setR(j as Result);
    } catch {
      setErr("Lỗi mạng, thử lại nhé.");
    } finally {
      setBusy(false);
    }
  }

  const sel = "inp appearance-none pr-8 cursor-pointer";
  const pct = r ? Math.round(((r.estimate_vnd - r.low_vnd) / Math.max(1, r.high_vnd - r.low_vnd)) * 100) : 50;

  return (
    <div>
      <section className="text-center py-8">
        <div className="kicker mb-2">Định giá bằng AI + dữ liệu thật</div>
        <h1 className="prata text-3xl mb-3">AI Định Giá Bất Động Sản</h1>
        <p className="text-[var(--ink-soft)] max-w-2xl mx-auto">
          Nhập thông tin tài sản - AI so sánh với các tin đang rao cùng khu vực trong dữ liệu của chúng tôi
          để đưa ra khoảng giá ước tính và dự phóng tương lai.
        </p>
      </section>

      <div className="grid gap-5 lg:grid-cols-[400px_1fr] items-start">
        {/* Form */}
        <form onSubmit={submit} className="card rounded-lg p-5 shadow-sm">
          <h2 className="font-bold mb-4">Thông tin tài sản</h2>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="lbl">Bán / Cho thuê</span>
              <select className={sel} value={f.deal} onChange={set("deal")}>
                <option value="ban">Bán</option>
                <option value="cho_thue">Cho thuê</option>
              </select>
            </label>
            <label className="block">
              <span className="lbl">Loại BĐS</span>
              <select className={sel} value={f.kind} onChange={set("kind")}>
                {Object.entries(PROP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </label>
            <label className="block col-span-2">
              <span className="lbl">Tỉnh/Thành phố *</span>
              <select className={sel} value={f.province} onChange={set("province")} required>
                <option value="">Chọn tỉnh/thành</option>
                {provinces.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label className="block col-span-2">
              <span className="lbl">Quận/Huyện</span>
              <select className={sel} value={f.district} onChange={set("district")} disabled={!districts.length}>
                <option value="">Toàn tỉnh/thành</option>
                {districts.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="lbl">Diện tích (m²) *</span>
              <input className="inp" type="number" min={1} required value={f.area_m2} onChange={set("area_m2")} placeholder="VD: 65" />
            </label>
            <label className="block">
              <span className="lbl">Phòng ngủ</span>
              <input className="inp" type="number" min={0} value={f.bedrooms} onChange={set("bedrooms")} placeholder="VD: 3" />
            </label>
            <label className="block">
              <span className="lbl">Số tầng</span>
              <input className="inp" type="number" min={0} value={f.floors} onChange={set("floors")} placeholder="VD: 4" />
            </label>
            <label className="block">
              <span className="lbl">Pháp lý</span>
              <select className={sel} value={f.legal} onChange={set("legal")}>
                <option value="">Không rõ</option>
                <option>Sổ hồng</option><option>Sổ đỏ</option><option>HĐMB</option><option>Đang chờ sổ</option>
              </select>
            </label>
            <label className="block col-span-2">
              <span className="lbl">Ghi chú thêm (mặt tiền, hẻm, nội thất...)</span>
              <textarea className="inp" rows={2} value={f.note} onChange={set("note")} placeholder="VD: mặt tiền đường 8m, full nội thất" />
            </label>
          </div>
          <button className="btn btn-primary w-full mt-4" disabled={busy} type="submit">
            {busy ? "AI đang định giá…" : "Định giá ngay"}
          </button>
          {err && <p className="text-sm text-red-600 mt-3 text-center">{err}</p>}
        </form>

        {/* Kết quả */}
        <div className="space-y-4">
          {!r && !busy && (
            <div className="card rounded-lg p-10 text-center text-[var(--ink-soft)]">
              <div className="text-4xl mb-3">🏷️</div>
              <p className="text-sm">Điền thông tin bên trái và bấm <b>Định giá ngay</b>.<br />
                Kết quả dựa trên các tin rao thật cùng khu vực + phân tích AI.</p>
            </div>
          )}
          {busy && (
            <div className="card rounded-lg p-10 text-center text-[var(--ink-soft)] animate-pulse">
              <div className="text-4xl mb-3">🤖</div>
              <p className="text-sm">Đang so sánh với các tin cùng khu vực…</p>
            </div>
          )}
          {r && (
            <>
              <div className="card rounded-lg p-6 border-brand/40 bg-brand/5">
                <div className="text-xs font-semibold text-[var(--ink-soft)] mb-1">Giá trị ước tính</div>
                <div className="text-4xl font-extrabold text-brand mb-3">{money(r.estimate_vnd, r.deal === "cho_thue")}</div>
                {/* Thanh khoảng giá */}
                <div className="relative h-2 rounded-full bg-[var(--surface-2)] mb-1">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-brand/40 to-brand" style={{ width: "100%" }} />
                  <div className="absolute -top-1 w-4 h-4 rounded-full bg-white border-[3px] border-brand shadow" style={{ left: `calc(${pct}% - 8px)` }} />
                </div>
                <div className="flex justify-between text-xs text-[var(--ink-soft)] mb-3">
                  <span>{money(r.low_vnd, r.deal === "cho_thue")}</span>
                  <span>{money(r.high_vnd, r.deal === "cho_thue")}</span>
                </div>
                {/* fallback "thap": confidence lạ (API cũ cache, LLM trả sai enum) không được crash cả trang kết quả */}
                <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full border ${(CONF[r.confidence] ?? CONF.thap)[1]}`}>
                  {(CONF[r.confidence] ?? CONF.thap)[0]}
                </span>
                <p className="text-sm text-[var(--ink-soft)] mt-3">{r.reasoning}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {([["Sau 1 năm", r.forecast_pct.y1], ["Sau 3 năm", r.forecast_pct.y3], ["Sau 5 năm", r.forecast_pct.y5]] as const).map(([t, p]) => (
                  <div key={t} className="card rounded-lg p-4 text-center">
                    <div className="text-xs text-[var(--ink-soft)] mb-1">{t}</div>
                    <div className="font-extrabold text-emerald-600">+{p}%</div>
                    <div className="text-sm font-semibold">{money(Math.round(r.estimate_vnd * (1 + p / 100)), r.deal === "cho_thue")}</div>
                  </div>
                ))}
              </div>

              <div className="card rounded-lg p-5">
                <h3 className="font-bold mb-2 text-sm">📊 Dữ liệu so sánh</h3>
                <div className="grid grid-cols-2 gap-y-1.5 text-sm">
                  <span className="text-[var(--ink-soft)]">Khu vực so sánh</span><span className="font-semibold text-right">{r.comps.scope}</span>
                  <span className="text-[var(--ink-soft)]">Số tin so sánh</span><span className="font-semibold text-right">{r.comps.count} tin</span>
                  <span className="text-[var(--ink-soft)]">Giá/m² trung vị</span><span className="font-semibold text-right">{money(r.comps.median_ppm2, r.deal === "cho_thue")}/m²</span>
                  {r.comps.p25_ppm2 && r.comps.p75_ppm2 && (
                    <><span className="text-[var(--ink-soft)]">Khoảng phổ biến</span>
                    <span className="font-semibold text-right">{money(r.comps.p25_ppm2)} - {money(r.comps.p75_ppm2)}/m²</span></>
                  )}
                </div>
                <Link href={`/search?deal=${r.deal}&province=${encodeURIComponent(f.province)}${f.district ? `&district=${encodeURIComponent(f.district)}` : ""}`}
                  className="btn w-full mt-3 text-sm text-center block">
                  Xem các tin so sánh ›
                </Link>
              </div>

              <p className="text-xs text-[var(--ink-faint)]">
                * Kết quả chỉ mang tính tham khảo dựa trên tin rao công khai, không phải chứng thư thẩm định giá.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
