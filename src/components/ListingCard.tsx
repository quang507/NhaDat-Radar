import Link from "next/link";
import type { Listing } from "@/lib/types";
import { fmtPrice, fresh, PROP, thumb } from "@/lib/format";
import FavButton from "./FavButton";

export default function ListingCard({ x }: { x: Listing }) {
  const t = thumb(x.kind);
  const isAgent = x.source === "agent";
  const ppm2 = x.price_per_m2 && x.deal === "ban" && x.price_per_m2 >= 1e6
    ? (x.price_per_m2 / 1e6).toFixed(0) + "tr/m²" : null;

  return (
    <Link
      href={`/listings/${x.id}`}
      className="group card rounded-2xl overflow-hidden hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
    >
      <div
        className="aspect-[16/10] grid place-items-center text-white relative overflow-hidden"
        style={{ background: t.bg }}
      >
        {x.images?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={x.images[0]} alt={x.title} className="lc-img w-full h-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1.5 opacity-95">
            <span className="w-12 h-12 rounded-full bg-white/20 grid place-items-center text-2xl backdrop-blur-sm">{t.icon}</span>
            <span className="text-[0.65rem] font-bold uppercase tracking-widest opacity-80">{PROP[x.kind]}</span>
          </span>
        )}
        <span className="absolute top-2 left-2 text-[0.7rem] font-bold px-2 py-0.5 rounded-md bg-black/55 text-white backdrop-blur-sm">
          {x.deal === "ban" ? "Để bán" : "Cho thuê"}
        </span>
        {x.price_flag && (
          <span className="absolute bottom-2 left-2 text-[0.65rem] font-bold px-2 py-0.5 rounded-md bg-red-500/90 text-white">
            ⚠ giá lệch
          </span>
        )}
        <FavButton id={x.id} className="absolute top-2 right-2" />
      </div>

      <div className="p-3.5 flex flex-col gap-1.5 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-brand font-extrabold text-lg leading-none">{fmtPrice(x.price_vnd, x.deal)}</span>
          {ppm2 && <span className="text-[0.7rem] text-[var(--ink-faint)] font-semibold">{ppm2}</span>}
        </div>
        <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-brand transition-colors">
          {x.title}
        </h3>
        <div className="text-xs text-[var(--ink-soft)] truncate">
          📍 {[x.district, x.province].filter(Boolean).join(", ") || "—"}
        </div>
        <div className="flex items-center gap-2.5 text-xs text-[var(--ink-soft)] font-medium">
          {x.area_m2 ? <span>📐 {x.area_m2}m²</span> : null}
          {x.bedrooms ? <span>🛏 {x.bedrooms}</span> : null}
          {x.bathrooms ? <span>🛁 {x.bathrooms}</span> : null}
          <span className="ml-auto text-[0.68rem] text-[var(--ink-faint)]">{PROP[x.kind]}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-auto pt-2 border-t border-[var(--line)] text-[0.66rem] font-bold">
          <span className={`px-1.5 py-0.5 rounded ${isAgent ? "text-emerald-600 bg-emerald-500/10" : "text-[var(--ink-soft)] bg-[var(--surface-2)]"}`}>
            {isAgent ? "✓ Tự đăng" : x.source_site || "crawl"}
          </span>
          {x.ai_score ? (
            <span className="px-1.5 py-0.5 rounded text-amber-600 bg-amber-500/10">★ {x.ai_score}</span>
          ) : null}
          {x.first_seen_at && (
            <span className="ml-auto font-medium text-emerald-600">
              {fresh(Math.round((Date.now() - new Date(x.first_seen_at).getTime()) / 60000))}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
