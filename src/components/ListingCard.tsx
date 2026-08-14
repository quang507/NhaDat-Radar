import Link from "next/link";
import type { Listing } from "@/lib/types";
import { fmtPrice, fresh, PROP, thumb } from "@/lib/format";
import FavButton from "./FavButton";

export default function ListingCard({ x }: { x: Listing }) {
  const t = thumb(x.kind);
  const isAgent = x.source === "agent";
  return (
    <Link
      href={`/listings/${x.id}`}
      className="card rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition flex flex-col"
    >
      <div
        className="aspect-[16/10] grid place-items-center text-white relative"
        style={{ background: t.bg }}
      >
        {x.images?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={x.images[0]} alt={x.title} className="w-full h-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1.5 opacity-95">
            <span className="w-12 h-12 rounded-full bg-white/20 grid place-items-center text-2xl backdrop-blur-sm">{t.icon}</span>
            <span className="text-[0.65rem] font-bold uppercase tracking-widest opacity-80">{PROP[x.kind]}</span>
          </span>
        )}
        <span className="absolute top-2 left-2 text-xs font-bold px-2 py-1 rounded bg-black/60 text-white">
          {x.deal === "ban" ? "Để bán" : "Cho thuê"}
        </span>
        <FavButton id={x.id} className="absolute top-2 right-2" />
      </div>
      <div className="p-3 flex flex-col gap-1.5 flex-1">
        <div className="text-brand font-extrabold text-lg">{fmtPrice(x.price_vnd, x.deal)}</div>
        <div className="font-semibold text-sm leading-snug line-clamp-2">{x.title}</div>
        <div className="text-xs text-[var(--ink-soft)]">
          📍 {[x.district, x.province].filter(Boolean).join(", ") || "-"}
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-[var(--ink-soft)]">
          {x.bedrooms ? <span>🛏 {x.bedrooms} PN</span> : null}
          {x.bathrooms ? <span>🛁 {x.bathrooms} WC</span> : null}
          {x.area_m2 ? <span>📐 {x.area_m2} m²</span> : null}
          <span>🏠 {PROP[x.kind]}</span>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-1 text-[0.66rem] font-bold">
          <span className="px-2 py-0.5 rounded border border-brand/40 text-brand bg-brand/10">
            {isAgent ? "✓ Tự đăng" : "🔗 " + (x.source_site || "crawl")}
          </span>
          {x.ai_score ? (
            <span className="px-2 py-0.5 rounded border border-amber-500/40 text-amber-600 bg-amber-500/10">
              ★ {x.ai_score}/100
            </span>
          ) : null}
          {x.price_flag ? (
            <span className="px-2 py-0.5 rounded border border-red-500/40 text-red-600 bg-red-500/10">
              ⚠ giá lệch
            </span>
          ) : null}
        </div>
        {x.first_seen_at && (
          <div className="text-[0.7rem] text-emerald-600 mt-auto pt-1">
            🕒 {fresh(Math.round((Date.now() - new Date(x.first_seen_at).getTime()) / 60000))}
          </div>
        )}
      </div>
    </Link>
  );
}
