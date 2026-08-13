export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PriceMap, { type MapPoint } from "@/components/PriceMap";
import type { Listing } from "@/lib/types";

const CITIES = ["Hà Nội", "Hồ Chí Minh", "Đà Nẵng"];

function median(a: number[]): number {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.floor(s.length / 2)];
}
function short(v: number): string {
  if (!v) return "—";
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
    .select("*")
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
    .map(([district, g]) => ({ district, med: median(g.prices), n: g.n, lat: g.lat / g.n, lng: g.lng / g.n }))
    .sort((a, b) => b.med - a.med);

  const points: MapPoint[] = rows.map((r) => ({
    lat: r.lat,
    lng: r.lng,
    label: short(r.med),
    sub: `${r.district} · ${r.n} tin`,
  }));
  const maxMed = Math.max(...rows.map((r) => r.med), 1);
  const lo = rows.length ? short(Math.min(...rows.map((r) => r.med))) : "—";
  const hi = rows.length ? short(Math.max(...rows.map((r) => r.med))) : "—";

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
        <div className="card rounded-2xl p-3">
          <div className="text-sm text-[var(--ink-soft)] mb-2 px-1">
            <b className="text-[var(--ink)]">{listings.length}</b> tin, giá {lo} – {hi} tại {city},{" "}
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

        <div className="card rounded-2xl p-5">
          <h3 className="font-bold mb-3">Xếp hạng giá theo quận</h3>
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
