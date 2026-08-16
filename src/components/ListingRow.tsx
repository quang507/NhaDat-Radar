"use client";

import Link from "next/link";
import type { Listing } from "@/lib/types";
import { fmtPrice, fresh, PROP, thumb } from "@/lib/format";
import FavButton from "./FavButton";
import SafeImg from "./SafeImg";

// Dòng kết quả kiểu batdongsan.com.vn: ảnh lớn + dải ảnh nhỏ bên trái,
// giá + giá/m² + diện tích + PN, mô tả 2 dòng, chân tin nguồn + thời gian.
export default function ListingRow({ x }: { x: Listing }) {
  const t = thumb(x.kind);
  const imgs = (x.images || []).slice(0, 4);
  // giá/m² cho cả bán lẫn thuê (batdongsan hiện trên mọi card)
  const ppm2 = x.price_per_m2 && x.price_per_m2 > 0
    ? (x.price_per_m2 >= 1e6 ? (x.price_per_m2 / 1e6).toFixed(1).replace(/\.0$/, "") + " tr/m²" : Math.round(x.price_per_m2 / 1e3) + "k/m²")
    : null;
  const loc = [x.district, x.province].filter(Boolean).join(", ");
  const ageMin = x.first_seen_at ? Math.round((Date.now() - new Date(x.first_seen_at).getTime()) / 60000) : null;
  const ago = ageMin != null ? fresh(ageMin) : null;
  const isNew = ageMin != null && ageMin < 24 * 60;
  const multi = (x.source_count ?? 1) > 1;

  return (
    <Link href={`/listings/${x.id}`} className="card rounded-xl overflow-hidden flex flex-col sm:flex-row hover:border-[var(--line-strong)] hover:shadow-md transition-all group">
      {/* Media: 1 ảnh lớn + tối đa 3 ảnh nhỏ */}
      <div className="sm:w-[300px] shrink-0 relative">
        {imgs.length ? (
          <div className={`grid gap-0.5 h-44 sm:h-full ${imgs.length > 1 ? "grid-rows-[2fr_1fr]" : ""}`}>
            <SafeImg src={imgs[0]} alt={x.title} className="w-full h-full object-cover" />
            {imgs.length > 1 && (
              <div className={`grid gap-0.5 ${imgs.length >= 4 ? "grid-cols-3" : imgs.length === 3 ? "grid-cols-2" : "grid-cols-1"}`}>
                {imgs.slice(1).map((u, i) => (
                  <SafeImg key={i} src={u} alt="" className="w-full h-full object-cover" />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="h-44 sm:h-full grid place-items-center text-white text-3xl" style={{ background: t.bg }}>{t.icon}</div>
        )}
        <span className="absolute top-2 left-2 flex items-center gap-1">
          <span className="text-[0.7rem] font-bold px-2 py-0.5 rounded bg-black/55 text-white">
            {x.deal === "ban" ? "Để bán" : "Cho thuê"}
          </span>
          {isNew && <span className="text-[0.65rem] font-bold px-1.5 py-0.5 rounded bg-emerald-500 text-white" title="Radar thấy tin trong 24 giờ qua">Mới</span>}
          {x.price_flag && <span className="text-[0.65rem] font-bold px-1.5 py-0.5 rounded bg-red-500/90 text-white">⚠ giá lệch</span>}
        </span>
        {imgs.length > 0 && (
          <span className="absolute bottom-2 right-2 text-[0.68rem] font-semibold px-1.5 py-0.5 rounded bg-black/55 text-white">
            {(x.images || []).length} ảnh
          </span>
        )}
      </div>

      {/* Nội dung */}
      <div className="flex-1 p-4 flex flex-col gap-1.5 min-w-0">
        <h3 className="font-semibold leading-snug line-clamp-2 group-hover:text-brand transition-colors uppercase text-[0.92rem]">
          {x.title}
        </h3>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-brand font-extrabold text-lg">{fmtPrice(x.price_vnd, x.deal)}</span>
          {ppm2 && <span className="text-sm text-[var(--ink-soft)] font-semibold">{ppm2}</span>}
          {x.area_m2 ? <span className="text-sm text-[var(--ink-soft)] font-semibold">{x.area_m2} m²</span> : null}
          {x.bedrooms ? <span className="text-sm text-[var(--ink-soft)]">{x.bedrooms} PN</span> : null}
          {x.bathrooms ? <span className="text-sm text-[var(--ink-soft)]">{x.bathrooms} WC</span> : null}
        </div>
        <div className="text-xs text-[var(--ink-soft)] truncate">{loc || "—"}</div>
        {x.description && (
          <p className="text-xs text-[var(--ink-soft)] line-clamp-2 leading-relaxed">{x.description}</p>
        )}
        <div className="mt-auto pt-2 border-t border-[var(--line)] flex items-center gap-2 text-[0.7rem]">
          <span className={`font-bold px-1.5 py-0.5 rounded ${x.source === "agent" ? "text-emerald-600 bg-emerald-500/10" : "text-[var(--ink-soft)] bg-[var(--surface-2)]"}`}>
            {x.source === "agent" ? "Tự đăng" : x.source_site || "crawl"}
          </span>
          {multi && (
            <span className="font-bold px-1.5 py-0.5 rounded text-emerald-700 bg-emerald-500/10" title={`Cùng tin xuất hiện trên: ${(x.source_sites || []).join(", ")}`}>
              {x.source_count} nguồn
            </span>
          )}
          <span className="text-[var(--ink-faint)]">{PROP[x.kind]}</span>
          {x.ai_score ? <span className="text-[var(--ink-faint)]" title="Điểm đầy đủ thông tin tin đăng (0-100)">{x.ai_score}/100</span> : null}
          {ago && <span className="text-emerald-600 font-medium" title={x.first_seen_at ? `Radar thấy tin: ${new Date(x.first_seen_at).toLocaleString("vi-VN")}` : undefined}>{ago}</span>}
          <span className="ml-auto" onClick={(e) => e.preventDefault()}><FavButton id={x.id} /></span>
        </div>
      </div>
    </Link>
  );
}
