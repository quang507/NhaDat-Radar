import Link from "next/link";
import { fmtPrice, PROP } from "@/lib/format";
import { cleanImages, thongTinAnh } from "@/lib/img";
import { maPhong, laRoHang } from "@/lib/ro-hang";
import { laTinDocQuyen, cheSoVanBan } from "@/lib/doc-quyen";
import type { ListingTuongTu } from "@/lib/tuong-tu";
import { MapPin, ShieldCheck, Camera } from "lucide-react";
import HangVuot from "@/components/HangVuot";
import FavButton from "@/components/FavButton";

import SafeImg from "@/components/SafeImg";
import PropertyPlaceholder from "@/components/PropertyPlaceholder";

export default function SimilarListings({
  items,
  loaiBDS,
  className = "mt-8 scroll-mt-28",
  id = "tin-tuong-tu",
}: {
  items: ListingTuongTu[];
  loaiBDS?: string;
  className?: string;
  id?: string;
}) {
  if (!items || items.length === 0) return null;

  const tenLoai = loaiBDS ? (PROP as Record<string, string>)[loaiBDS] || loaiBDS : "Phòng";

  return (
    <section id={id} className={className}>
      <div className="mb-3.5">
        <h3 className="font-bold text-base sm:text-lg text-[var(--ink)]">
          {tenLoai} tương tự quanh đây
        </h3>
        <p className="text-xs text-[var(--ink-soft)] mt-0.5">
          Các căn đang trống gần địa chỉ này, mức giá chênh không quá 30%
        </p>
      </div>

      <HangVuot
        motHang
        hep
        items={items.map((x) => {
          const img = cleanImages(x.images || [])[0] || null;
          const xacThuc = laRoHang(x);
          const anh = thongTinAnh(x);
          const title = cheSoVanBan(x.title, laTinDocQuyen(x));
          const diaChiNgan = [x.ward, x.district].filter(Boolean).join(", ") || x.province || "-";

          return {
            key: x.id,
            node: (
              <Link
                href={`/listings/${x.id}`}
                className={`group card rounded-lg overflow-hidden border border-[var(--line)] hover:border-brand/50 transition-all duration-200 flex flex-col h-full bg-[var(--surface)] ${
                  xacThuc ? "border-t-2 border-t-brand" : ""
                }`}
              >
                <div className="relative aspect-[16/10] overflow-hidden bg-[var(--surface-2)]">
                  {img ? (
                    <SafeImg
                      the
                      src={img}
                      alt={title}
                      fallbackLabel={x.kind}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <PropertyPlaceholder kind={x.kind} />
                  )}

                  {/* Góc trái: chỉ giữ 1 nhãn nhỏ gọn để không che ảnh phòng */}
                  <div className="absolute top-2 left-2 right-12 flex items-center gap-1">
                    {xacThuc && (
                      <span className="inline-flex items-center gap-0.5 text-overline tracking-tight font-bold px-1.5 py-0.5 rounded-sm whitespace-nowrap bg-emerald-600/95 text-white shadow-xs">
                        <ShieldCheck className="w-2.5 h-2.5 stroke-[2.5]" />
                        XÁC MINH
                      </span>
                    )}
                  </div>

                  <FavButton id={x.id} className="absolute top-2 right-2" />

                  {anh.so > 1 && (
                    <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 text-overline font-semibold px-1.5 py-0.5 rounded bg-black/70 text-white">
                      <Camera className="w-3 h-3" />
                      <span>{anh.so}</span>
                    </span>
                  )}
                </div>

                <div className="p-3.5 flex flex-col flex-1 justify-between gap-2">
                  <div>
                    <div className="flex items-baseline justify-between gap-1.5">
                      <span className="text-brand font-extrabold text-lg leading-none tracking-tight">
                        {fmtPrice(x.price_vnd, x.deal)}
                      </span>
                      {x.area_m2 ? (
                        <span className="text-xs font-semibold text-[var(--ink-soft)] shrink-0">
                          {x.area_m2} m²
                        </span>
                      ) : null}
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-[var(--ink)] leading-snug line-clamp-2 mt-1.5 group-hover:text-brand transition-colors">
                      {title}
                    </h4>
                  </div>

                  <div className="pt-2 border-t border-[var(--line)] space-y-1">
                    <div className="text-xs text-[var(--ink-soft)] flex items-center gap-1 truncate">
                      <MapPin className="w-3.5 h-3.5 text-brand/70 shrink-0" />
                      <span className="truncate">{diaChiNgan}</span>
                    </div>

                    <div className="flex items-center justify-between gap-1 text-[0.7rem] text-[var(--ink-faint)]">
                      <span className="truncate">{x.lyDoGoiY}</span>
                      {xacThuc && (
                        <span className="font-mono font-semibold text-[var(--ink-soft)] shrink-0">
                          {maPhong(x.id)}
                        </span>
                      )}
                    </div>
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
