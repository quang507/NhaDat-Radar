// Biểu đồ xu hướng giá/m² trung vị theo ngày từ bảng price_history (crawler/price-history.mjs snapshot mỗi sáng).
// Ưu tiên đúng quận + loại hình; thiếu thì lùi về quận (mọi loại) -> toàn tỉnh. Dữ liệu thật, <2 điểm thì nói thẳng "đang tích luỹ".
import { createClient } from "@/lib/supabase/server";

type Row = { day: string; median_ppm2: number; n: number };
const canonDistrict = (s: string) => s.replace(/\s*\([^)]*\)\s*$/, "").trim();
const fmtPpm2 = (v: number) => (v >= 1e6 ? (v / 1e6).toFixed(1).replace(/\.0$/, "") + " tr/m²" : Math.round(v / 1e3) + "k/m²");

export default async function PriceTrend({ province, district, kind, deal, compact = false }: {
  province: string; district?: string | null; kind?: string | null; deal: string; compact?: boolean;
}) {
  const supabase = await createClient();
  const d = district ? canonDistrict(district) : "";
  // các mức thử theo thứ tự cụ thể -> rộng
  const tries: { district: string; kind: string; label: string }[] = [];
  if (d && kind) tries.push({ district: d, kind, label: `${kind === "all" ? "" : ""}${d}` });
  if (d) tries.push({ district: d, kind: "all", label: d });
  tries.push({ district: "", kind: "all", label: province });

  let series: { day: string; v: number; n: number }[] = [], scope = "";
  for (const t of tries) {
    const { data } = await supabase.from("price_history").select("day,median_ppm2,n")
      .eq("province", province).eq("deal", deal).eq("district", t.district).eq("kind", t.kind)
      .order("day", { ascending: true }).limit(120)
      .then((r) => r, () => ({ data: null as Row[] | null }));
    if (data && data.length >= 2) { series = data.map((r) => ({ day: r.day, v: Number(r.median_ppm2), n: r.n })); scope = t.label; break; }
  }
  if (series.length < 2) {
    return compact ? null : (
      <p className="text-xs text-[var(--ink-faint)] rounded-lg bg-[var(--surface-2)] p-2.5">
        📈 Lịch sử giá tại {d || province} đang được tích luỹ mỗi ngày — biểu đồ sẽ hiện sau vài ngày dữ liệu.
      </p>
    );
  }
  const W = 320, H = compact ? 60 : 90, PAD = 4;
  const vs = series.map((s) => s.v);
  const min = Math.min(...vs), max = Math.max(...vs), span = Math.max(1, max - min);
  const path = series.map((s, i) => {
    const px = PAD + (i / (series.length - 1)) * (W - PAD * 2);
    const py = PAD + (1 - (s.v - min) / span) * (H - PAD * 2);
    return `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`;
  }).join(" ");
  const first = vs[0], last = vs[vs.length - 1];
  const changePct = Math.round(((last - first) / first) * 1000) / 10;
  const from = new Date(series[0].day).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  const to = new Date(series[series.length - 1].day).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });

  return (
    <div className="rounded-xl border border-[var(--line)] p-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
        <span className={`font-extrabold ${changePct >= 0 ? "text-emerald-600" : "text-red-600"}`}>{changePct >= 0 ? "↑" : "↓"} {Math.abs(changePct)}%</span>
        <span className="text-xs text-[var(--ink-soft)]">
          giá/m² trung vị {deal === "ban" ? "bán" : "thuê"} tại {scope}: {fmtPpm2(first)} → <b>{fmtPpm2(last)}</b> ({from}–{to}, {series.length} ngày, ~{series[series.length - 1].n} tin/ngày)
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto mt-1" role="img" aria-label="Biểu đồ giá/m² trung vị theo ngày">
        <path d={`${path} L${W - PAD},${H - PAD} L${PAD},${H - PAD} Z`} fill="var(--brand)" opacity={0.1} />
        <path d={path} fill="none" stroke="var(--brand)" strokeWidth={2} strokeLinejoin="round" />
        <circle cx={W - PAD} cy={PAD + (1 - (last - min) / span) * (H - PAD * 2)} r={3} fill="var(--brand)" />
      </svg>
    </div>
  );
}
