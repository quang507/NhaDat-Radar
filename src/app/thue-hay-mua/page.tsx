export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { median } from "@/lib/gemini";
import RentVsBuyCalc from "./RentVsBuyCalc";

export const metadata = { title: "Thuê hay Mua? Tỷ suất cho thuê theo quận - NhaDat Radar" };

export default async function RentVsBuyPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select("district,province,deal,price_per_m2")
    .eq("status", "published").not("price_per_m2", "is", null).gt("price_per_m2", 0)
    .limit(3000);

  const by = new Map<string, { ban: number[]; thue: number[]; province: string }>();
  for (const r of data ?? []) {
    const d = (r.district || "").trim();
    if (!d) continue;
    const e = by.get(d) || { ban: [], thue: [], province: r.province || "" };
    (r.deal === "ban" ? e.ban : e.thue).push(Number(r.price_per_m2));
    by.set(d, e);
  }
  const rows = [...by.entries()]
    .map(([district, e]) => {
      const banMed = median(e.ban), thueMed = median(e.thue);
      return {
        district, province: e.province,
        banMed, thueMed,
        nBan: e.ban.length, nThue: e.thue.length,
        yieldPct: banMed && thueMed ? Math.round(((thueMed * 12) / banMed) * 1000) / 10 : null,
      };
    })
    .filter((r) => r.yieldPct != null && r.nBan >= 3 && r.nThue >= 3)
    .sort((a, b) => (b.yieldPct ?? 0) - (a.yieldPct ?? 0));

  const fm = (v: number | null) => (v ? (v >= 1e6 ? (v / 1e6).toFixed(1) + "tr" : Math.round(v / 1e3) + "k") : "—");

  return (
    <div>
      <section className="text-center py-8">
        <div className="kicker mb-2">Từ dữ liệu tin bán + tin thuê thật</div>
        <h1 className="prata text-3xl mb-3">Thuê Hay Mua?</h1>
        <p className="text-[var(--ink-soft)] max-w-2xl mx-auto">
          So sánh chi phí thuê với chi phí mua trả góp, và xem tỷ suất cho thuê (rental yield)
          từng quận — quận yield cao là nơi đầu tư cho thuê hiệu quả.
        </p>
      </section>

      <div className="grid gap-5 lg:grid-cols-2 items-start">
        <RentVsBuyCalc />

        <div className="card rounded-lg p-5">
          <h2 className="font-bold mb-1">📈 Tỷ suất cho thuê theo quận</h2>
          <p className="text-xs text-[var(--ink-soft)] mb-3">
            Yield gộp/năm = (giá thuê/m²/tháng × 12) ÷ giá bán/m². Trên 4%/năm thường được coi là tốt tại VN.
          </p>
          {rows.length ? (
            <div className="space-y-1.5 text-sm">
              <div className="grid grid-cols-[1fr_70px_70px_60px] gap-2 text-[0.65rem] font-bold uppercase text-[var(--ink-faint)] pb-1 border-b border-[var(--line)]">
                <span>Quận</span><span className="text-right">Bán/m²</span><span className="text-right">Thuê/m²/th</span><span className="text-right">Yield</span>
              </div>
              {rows.slice(0, 15).map((r) => (
                <div key={r.district + r.province} className="grid grid-cols-[1fr_70px_70px_60px] gap-2 items-center py-1 border-b border-[var(--line)] last:border-0">
                  <span className="truncate">{r.district} <span className="text-[var(--ink-faint)] text-xs">({r.province})</span></span>
                  <span className="text-right font-mono text-xs">{fm(r.banMed)}</span>
                  <span className="text-right font-mono text-xs">{fm(r.thueMed)}</span>
                  <span className={`text-right font-bold ${(r.yieldPct ?? 0) >= 4 ? "text-emerald-600" : "text-[var(--ink-soft)]"}`}>{r.yieldPct}%</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--ink-soft)]">Chưa đủ dữ liệu bán + thuê cùng quận để tính yield.</p>
          )}
          <p className="text-[0.68rem] text-[var(--ink-faint)] mt-3">
            * Yield gộp chưa trừ thuế, phí bảo trì, thời gian trống nhà. Chỉ mang tính tham khảo.
          </p>
        </div>
      </div>
    </div>
  );
}
