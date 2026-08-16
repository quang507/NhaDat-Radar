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
  // UX audit 16/8: min-max scaling biến -4,6% thành "vách đá" -> co trục Y quanh trung bình với biên tối thiểu ±15%
  // để độ dốc phản ánh biến động thật; và chỉ nói % khi có >=7 ngày (dưới đó là nhiễu do mẫu tin thay đổi).
  const mid = (Math.min(...vs) + Math.max(...vs)) / 2;
  const half = Math.max((Math.max(...vs) - Math.min(...vs)) / 2, mid * 0.15);
  const min = mid - half, span = half * 2;
  const MIN_DAYS_FOR_PCT = 7;
  const enoughDays = series.length >= MIN_DAYS_FOR_PCT;
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
        {enoughDays ? (
          <span className={`font-extrabold ${changePct >= 0 ? "text-emerald-600" : "text-red-600"}`}>{changePct >= 0 ? "↑" : "↓"} {Math.abs(changePct)}%</span>
        ) : (
          <span className="font-bold text-[var(--ink-soft)]">Đang tích luỹ ({series.length}/{MIN_DAYS_FOR_PCT} ngày)</span>
        )}
        <span className="text-xs text-[var(--ink-soft)]">
          giá/m² trung vị {deal === "ban" ? "bán" : "thuê"} <b>tại {scope}</b>{scope !== (d || province) ? " (chưa đủ dữ liệu riêng cho " + (d || province) + ")" : ""}: {fmtPpm2(first)} → <b>{fmtPpm2(last)}</b> ({from}–{to}, ~{series[series.length - 1].n} tin/ngày)
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto max-h-28 mt-1" preserveAspectRatio="none" role="img" aria-label="Biểu đồ giá/m² trung vị theo ngày">
        <path d={`${path} L${W - PAD},${H - PAD} L${PAD},${H - PAD} Z`} fill="var(--brand)" opacity={0.1} />
        <path d={path} fill="none" stroke="var(--brand)" strokeWidth={2} strokeLinejoin="round" />
        <circle cx={W - PAD} cy={PAD + (1 - (last - min) / span) * (H - PAD * 2)} r={3} fill="var(--brand)" />
      </svg>
    </div>
  );
}
