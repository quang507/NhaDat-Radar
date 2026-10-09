import Link from "next/link";
import type { Listing } from "@/lib/types";
import { fmtPrice, fmtPpm2, fresh, PROP, thumb } from "@/lib/format";
import FavButton from "./FavButton";
import SafeImg from "./SafeImg";
import { thongTinAnh } from "@/lib/img";
import { laTinDocQuyen, cheSoVanBan } from "@/lib/doc-quyen";
import { laRoHang, tenNguon } from "@/lib/ro-hang";
import { ShieldCheck, MapPin, Camera, AlertCircle } from "lucide-react";

export default function ListingCard({ x }: { x: Listing }) {
  const t = thumb(x.kind);
  const isAgent = x.source === "agent";
  const xacThuc = laTinDocQuyen(x);
  const ppm2 = x.price_per_m2 && x.price_per_m2 > 0 ? fmtPpm2(x.price_per_m2) : null;
  const ageMin = x.first_seen_at ? Math.round((Date.now() - new Date(x.first_seen_at).getTime()) / 60000) : null;
  const isNew = ageMin != null && ageMin < 24 * 60;
  const multi = (x.source_count ?? 1) > 1;
  const roHang = laRoHang(x);
  const anh = thongTinAnh(x);
  const title = laTinDocQuyen(x) ? cheSoVanBan(x.title) : x.title;
  const location = [x.district, x.province].filter(Boolean).join(", ") || "-";

  return (
    <Link
      href={`/listings/${x.id}`}
      className="reveal group card rounded-2xl overflow-hidden hover:border-slate-300 hover:shadow-lg transition-all duration-300 flex flex-col w-full bg-white border border-slate-200/80"
    >
      {/* Thumbnail */}
      <div
        className="aspect-[16/10] grid place-items-center text-white relative overflow-hidden"
        style={{ background: x.images?.[0] ? "var(--surface-2)" : t.bg }}
      >
        {x.images?.[0] ? (
          <SafeImg src={x.images[0]} alt={title} className="lc-img w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <span className="flex flex-col items-center gap-1.5 opacity-90">
            <span className="w-12 h-12 rounded-full bg-white/20 grid place-items-center text-2xl backdrop-blur-sm">{t.icon}</span>
            <span className="text-[0.65rem] font-bold uppercase tracking-widest opacity-80">{PROP[x.kind]}</span>
          </span>
        )}

        {/* Top-left badges: Tối đa 2 badge tinh gọn */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap max-w-[80%]">
          {xacThuc && (
            <span className="inline-flex items-center gap-1 text-[0.65rem] font-bold px-2 py-0.5 rounded-full bg-emerald-600/95 text-white shadow-sm backdrop-blur-sm tracking-wide">
              <ShieldCheck className="w-3 h-3 stroke-[2.5]" />
              ĐÃ XÁC MINH
            </span>
          )}
          <span className="text-[0.68rem] font-semibold px-2 py-0.5 rounded-full bg-black/50 text-white backdrop-blur-md">
            {x.deal === "ban" ? "Bán" : "Cho thuê"}
          </span>
          {isNew && !xacThuc && (
            <span className="text-[0.65rem] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-sm">
              Mới
            </span>
          )}
        </div>

        {/* Top-right FavButton */}
        <FavButton id={x.id} className="absolute top-2.5 right-2.5" />

        {/* Bottom-right photo count */}
        {anh.so > 1 && (
          <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 text-[0.65rem] font-semibold px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-md">
            <Camera className="w-3 h-3" />
            <span>{anh.so}</span>
          </span>
        )}
      </div>

      {/* Card Content */}
      <div className="p-3.5 sm:p-4 flex flex-col gap-2 flex-1">
        {/* Price & Price/m² */}
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-brand font-black text-lg sm:text-xl leading-none tracking-tight">{fmtPrice(x.price_vnd, x.deal)}</span>
            {ppm2 && <span className="text-[0.72rem] text-slate-500 font-semibold">{ppm2}</span>}
          </div>
          {x.price_flag && (
            <span className="inline-flex items-center gap-1 text-[0.62rem] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200/70" title="Giá có độ lệch đáng chú ý so với mặt bằng">
              <AlertCircle className="w-3 h-3" />
              Lệch giá
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-bold text-sm text-slate-900 leading-snug line-clamp-2 group-hover:text-brand transition-colors">
          {title}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-1 text-xs text-slate-500 truncate">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{location}</span>
        </div>

        {/* Specs: Diện tích, Phòng ngủ, WC */}
        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium pt-0.5">
          {x.area_m2 ? <span>{x.area_m2} m²</span> : null}
          {x.area_m2 && (x.bedrooms || x.bathrooms) ? <span className="text-slate-300">•</span> : null}
          {x.bedrooms ? <span>{x.bedrooms} PN</span> : null}
          {x.bedrooms && x.bathrooms ? <span className="text-slate-300">•</span> : null}
          {x.bathrooms ? <span>{x.bathrooms} WC</span> : null}
          <span className="ml-auto text-[0.68rem] text-slate-400 font-semibold">{PROP[x.kind]}</span>
        </div>

        {/* Footer Meta */}
        <div className="flex items-center justify-between gap-2 mt-auto pt-2.5 border-t border-slate-100 text-[0.68rem] text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className={`px-2 py-0.5 rounded-full font-bold ${
              isAgent ? "text-emerald-700 bg-emerald-50" : roHang ? "text-emerald-800 bg-emerald-50 border border-emerald-200/50" : "text-slate-600 bg-slate-100"
            }`}>
              {tenNguon(x)}
            </span>
            {multi && (
              <span className="px-1.5 py-0.5 rounded text-emerald-700 bg-emerald-50 font-semibold" title={`Cùng tin xuất hiện trên: ${(x.source_sites || []).join(", ")}`}>
                {x.source_count} nguồn
              </span>
            )}
          </div>
          {ageMin != null && (
            <span
              suppressHydrationWarning
              className="font-medium text-slate-500 shrink-0"
              title={`Radar thấy tin: ${new Date(x.first_seen_at!).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" })}`}
            >
              {fresh(ageMin)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
