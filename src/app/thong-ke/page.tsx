export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PriceMap, { type MapPoint } from "@/components/PriceMap";
import type { Listing } from "@/lib/types";
import { median } from "@/lib/gemini";

const CITIES = ["Hà Nội", "Hồ Chí Minh", "Đà Nẵng"];

function short(v: number): string {
  if (!v) return "-";
  if (v >= 1e9) {
    const t = v / 1e9;
    return (t % 1 ? t.toFixed(1) : String(t)) + "tỷ";
  }
  if (v >= 1e6) return Math.round(v / 1e6) + "tr";
  return Math.round(v / 1e3) + "k";
}

export default async function ThongKe({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; deal?: string }>;
}) {
  const sp = await searchParams;
  const deal = sp.deal === "ban" ? "ban" : "cho_thue";
  const city = CITIES.includes(sp.city || "") ? sp.city! : "Hà Nội";

  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select("id,title,price_vnd,area_m2,price_per_m2,district,lat,lng,kind,deal")
    .eq("status", "published")
    .eq("deal", deal)
    .eq("province", city)
    .not("lat", "is", null)
    .not("price_vnd", "is", null)
    .limit(1000);
  const listings = (data ?? []) as Listing[];

  const m: Record<string, { prices: number[]; lat: number; lng: number; n: number }> = {};
  for (const x of listings) {
    if (!x.district || x.lat == null || x.lng == null || x.price_vnd == null) continue;
    const g = m[x.district] ?? (m[x.district] = { prices: [], lat: 0, lng: 0, n: 0 });
    g.prices.push(x.price_vnd);
    g.lat += x.lat;
    g.lng += x.lng;
    g.n++;
  }
  const rows = Object.entries(m)
    .map(([district, g]) => ({ district, med: median(g.prices) ?? 0, n: g.n, lat: g.lat / g.n, lng: g.lng / g.n }))
    .sort((a, b) => b.med - a.med);

  const points: MapPoint[] = rows.map((r) => ({
    lat: r.lat,
    lng: r.lng,
    label: short(r.med),
    sub: `${r.district} · ${r.n} tin`,
  }));
  const maxMed = Math.max(...rows.map((r) => r.med), 1);
  const lo = rows.length ? short(Math.min(...rows.map((r) => r.med))) : "-";
  const hi = rows.length ? short(Math.max(...rows.map((r) => r.med))) : "-";

  const tab = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      className={`px-4 py-2 rounded-lg text-sm font-semibold border ${active ? "bg-brand text-white border-brand" : "border-[var(--line)] text-[var(--ink-soft)]"}`}
    >
      {label}
    </Link>
  );

  return (
    <div>
      <h1 className="prata text-2xl mb-1">Thống kê giá theo khu vực</h1>
      <p className="text-[var(--ink-soft)] text-sm mb-4">
        Vị trí theo toạ độ thật (geocode) · giá median theo quận · bản đồ OpenStreetMap (miễn phí).
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {CITIES.map((c) => tab(`/thong-ke?city=${encodeURIComponent(c)}&deal=${deal}`, c, c === city))}
        <span className="w-px bg-[var(--line)] mx-1" />
        {tab(`/thong-ke?city=${encodeURIComponent(city)}&deal=cho_thue`, "Cho thuê", deal === "cho_thue")}
        {tab(`/thong-ke?city=${encodeURIComponent(city)}&deal=ban`, "Mua bán", deal === "ban")}
      </div>

      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-4">
        <div className="card rounded-lg p-3">
          <div className="text-sm text-[var(--ink-soft)] mb-2 px-1">
            <b className="text-[var(--ink)]">{listings.length}</b> tin, giá {lo} - {hi} tại {city},{" "}
            {deal === "cho_thue" ? "cho thuê" : "rao bán"}
          </div>
          {points.length ? (
            <PriceMap points={points} height={460} />
          ) : (
            <div className="h-[460px] grid place-items-center text-[var(--ink-soft)]">
              Chưa có dữ liệu geocode cho khu vực này.
            </div>
          )}
        </div>

        <div className="card rounded-lg p-5">
          <h3 className="font-bold mb-3">Xếp hạng giá theo quận</h3>
          <PriceHistoryChart city={city} deal={deal} />
          {rows.length ? (
            <div className="flex flex-col gap-2">
              {rows.map((r) => (
                <div key={r.district} className="grid grid-cols-[110px_1fr_64px] items-center gap-2 text-sm">
                  <span className="text-[var(--ink-soft)] truncate" title={r.district}>
                    {r.district.replace(/^(Quận|Huyện) /, "")} <span className="text-[var(--ink-faint)]">({r.n})</span>
                  </span>
                  <span className="h-2.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
                    <span
                      className="block h-full rounded-full bg-gradient-to-r from-brand to-brand-2"
                      style={{ width: `${Math.max(7, (r.med / maxMed) * 100)}%` }}
                    />
                  </span>
                  <span className="text-right font-mono text-xs font-semibold">{short(r.med)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[var(--ink-soft)] text-sm">Không có dữ liệu.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Biểu đồ lịch sử giá/m² trung vị toàn thành phố (từ bảng price_history, snapshot mỗi ngày 5h sáng).
async function PriceHistoryChart({ city, deal }: { city: string; deal: string }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("price_history")
    .select("day,median_ppm2,n")
    .eq("province", city).eq("deal", deal).eq("district", "").eq("kind", "all")
    .order("day", { ascending: true })
    .limit(120)
    .then((r) => r, () => ({ data: null })); // bảng chưa tạo (chưa chạy migration 003) -> ẩn êm

  // Nếu chưa có dòng tổng hợp toàn tỉnh (district='') thì gộp theo ngày từ các quận
  let series: { day: string; v: number }[] = (data ?? []).map((r) => ({ day: r.day, v: Number(r.median_ppm2) }));
  if (!series.length) {
    const { data: all } = await supabase
      .from("price_history").select("day,median_ppm2")
      .eq("province", city).eq("deal", deal)
      .order("day", { ascending: true }).limit(2000)
      .then((r) => r, () => ({ data: null }));
    const byDay = new Map<string, number[]>();
    for (const r of all ?? []) (byDay.get(r.day) ?? byDay.set(r.day, []).get(r.day)!).push(Number(r.median_ppm2));
    series = [...byDay.entries()].map(([day, vs]) => ({ day, v: Math.round(vs.reduce((a, b) => a + b, 0) / vs.length) }));
  }
  if (series.length < 2) {
    return (
      <p className="text-xs text-[var(--ink-faint)] mb-4 rounded-lg bg-[var(--surface-2)] p-2.5">
        📈 Lịch sử giá đang được tích luỹ mỗi ngày — biểu đồ xu hướng sẽ hiện tại đây sau vài ngày dữ liệu.
      </p>
    );
  }

  const W = 320, H = 90, PAD = 4;
  const vs = series.map((s) => s.v);
  const min = Math.min(...vs), max = Math.max(...vs), span = Math.max(1, max - min);
  const path = series.map((s, i) => {
    const px = PAD + (i / (series.length - 1)) * (W - PAD * 2);
    const py = PAD + (1 - (s.v - min) / span) * (H - PAD * 2);
    return `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`;
  }).join(" ");
  const changePct = Math.round(((vs[vs.length - 1] - vs[0]) / vs[0]) * 1000) / 10;

  return (
    <div className="mb-4 rounded-xl border border-[var(--line)] p-3">
      <div className="flex items-baseline gap-2 text-sm">
        <span className={`font-extrabold ${changePct >= 0 ? "text-emerald-600" : "text-red-600"}`}>
          {changePct >= 0 ? "↑" : "↓"} {Math.abs(changePct)}%
        </span>
        <span className="text-xs text-[var(--ink-soft)]">
          giá/m² trung vị {deal === "ban" ? "bán" : "thuê"} tại {city} ({series.length} ngày ghi nhận)
        </span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto mt-1">
        <path d={`${path} L${W - PAD},${H - PAD} L${PAD},${H - PAD} Z`} fill="var(--brand)" opacity={0.1} />
        <path d={path} fill="none" stroke="var(--brand)" strokeWidth={2} strokeLinejoin="round" />
      </svg>
    </div>
  );
}
