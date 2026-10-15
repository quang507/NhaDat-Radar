import Link from "next/link";
import { fmtPrice, PROP, thumb } from "@/lib/format";
import { cleanImages } from "@/lib/img";
import type { ListingTuongTu } from "@/lib/tuong-tu";
import { Sparkles, MapPin, CheckCircle2 } from "lucide-react";
import HangVuot from "@/components/HangVuot";

import SafeImg from "@/components/SafeImg";
import PropertyPlaceholder from "@/components/PropertyPlaceholder";

export default function SimilarListings({
  items,
  loaiBDS,
}: {
  items: ListingTuongTu[];
  loaiBDS?: string;
}) {
  if (!items || items.length === 0) return null;

  return (
    <section id="tin-tuong-tu" className="mt-12 scroll-mt-28">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-brand/10 text-brand">
              <Sparkles className="w-5 h-5" />
            </span>
            <h2 className="prata text-xl font-bold">
              Gợi ý {loaiBDS ? (PROP as Record<string, string>)[loaiBDS] || loaiBDS : "nhà đất"} tương tự
            </h2>
          </div>
          <p className="text-xs text-[var(--ink-soft)] mt-1">
            Được AI chọn lọc theo vị trí gần nhất, phân khúc giá tương đương (±30%) &amp; đặc điểm phòng
          </p>
        </div>
      </div>

      <HangVuot
        cot={230}
        items={items.map((x) => {
          const img = cleanImages(x.images || [])[0] || null;
          return {
            key: x.id,
            node: (
              <Link
                href={`/listings/${x.id}`}
                className="group card rounded-2xl overflow-hidden border border-[var(--line)] hover:border-brand/50 hover:shadow-lg transition-all flex flex-col h-full bg-[var(--surface)]"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-[var(--surface-2)]">
                  {img ? (
                    <SafeImg
                      src={img}
                      alt={x.title}
                      fallbackLabel={x.kind}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <PropertyPlaceholder kind={x.kind} />
                  )}
                  {x.lyDoGoiY && (
                    <span className="absolute top-2.5 left-2.5 text-[0.68rem] font-semibold bg-brand text-white px-2 py-0.5 rounded-full shadow-sm flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{x.lyDoGoiY}</span>
                    </span>
                  )}
                  {x.source === "ro_hang" && (
                    <span className="absolute bottom-2.5 left-2.5 text-[0.65rem] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded shadow-sm">
                      Rổ hàng xác minh
                    </span>
                  )}
                </div>

                <div className="p-3.5 flex flex-col flex-1 justify-between gap-2">
                  <div>
                    <div className="text-brand font-extrabold text-base leading-snug">
                      {fmtPrice(x.price_vnd, x.deal)}
                    </div>
                    <h3 className="text-xs font-semibold text-[var(--ink)] line-clamp-2 mt-1 group-hover:text-brand transition-colors">
                      {x.title}
                    </h3>
                  </div>

                  <div className="text-[0.7rem] text-[var(--ink-soft)] flex items-center gap-1 truncate pt-2 border-t border-[var(--line)]">
                    <MapPin className="w-3.5 h-3.5 text-[var(--ink-faint)] shrink-0" />
                    <span className="truncate">
                      {[x.ward, x.district, x.province].filter(Boolean).join(", ")}
                    </span>
                  </div>
                </div>
              </Link>
            ),
          };
        })}
      />
    </section>
  );
}
