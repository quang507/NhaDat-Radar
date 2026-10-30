import Link from "next/link";
import type { Listing } from "@/lib/types";
import { fmtPrice, fmtPpm2, fresh, PROP, thumb } from "@/lib/format";
import FavButton from "./FavButton";
import SafeImg from "./SafeImg";
import PropertyPlaceholder from "./PropertyPlaceholder";
import { thongTinAnh } from "@/lib/img";
import { laTinDocQuyen, cheSoVanBan } from "@/lib/doc-quyen";
import { laRoHang, tenNguon } from "@/lib/ro-hang";
import { ShieldCheck, MapPin, Camera, AlertCircle, Play } from "lucide-react";

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
      className={`reveal group card rounded-lg overflow-hidden transition-all duration-200 flex flex-col w-full ${
        xacThuc ? "border-t-2 border-t-brand" : ""
      }`}
    >
      {/* Thumbnail */}
      <div
        className="aspect-[16/10] grid place-items-center text-white relative overflow-hidden"
        style={{ background: x.images?.[0] ? "var(--surface-2)" : t.bg }}
      >
        {x.images?.[0] ? (
          <SafeImg src={x.images[0]} alt={title} fallbackLabel={PROP[x.kind]} className="lc-img w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <PropertyPlaceholder kind={x.kind} />
        )}

        {/* Top-left badges: Tối đa 2 badge tinh gọn. right-12 chừa nút tim 40px */}
        <div className="absolute top-2 left-2 right-12 flex items-center gap-1 flex-wrap">
          {xacThuc && (
            <span className="inline-flex items-center gap-0.5 text-overline tracking-tight font-bold px-1 py-0.5 rounded-sm whitespace-nowrap bg-emerald-600/95 text-white shadow-xs">
              <ShieldCheck className="w-2.5 h-2.5 stroke-[2.5]" />
              XÁC MINH
            </span>
          )}
          {anh.video && (
            <span className="inline-flex items-center gap-0.5 text-overline tracking-tight font-bold px-1 py-0.5 rounded-sm whitespace-nowrap bg-rose-600/95 text-white shadow-xs">
              <Play className="w-2.5 h-2.5 fill-current" />
              CÓ VIDEO
            </span>
          )}
          <span className="text-overline tracking-tight font-semibold px-1.5 py-0.5 rounded whitespace-nowrap bg-black/65 text-white">
            {x.deal === "ban" ? "Bán" : "Cho thuê"}
          </span>
          {isNew && !xacThuc && !anh.video && (
            <span className="text-overline tracking-tight font-bold px-1.5 py-0.5 rounded whitespace-nowrap bg-amber-600 text-white shadow-xs">
              Mới
            </span>
          )}
        </div>

        {/* Top-right FavButton */}
        <FavButton id={x.id} className="absolute top-2 right-2" />

        {/* Bottom-right photo count */}
        {anh.so > 1 && (
          <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 text-overline font-semibold px-1.5 py-0.5 rounded bg-black/70 text-white">
            <Camera className="w-3 h-3" />
            <span>{anh.so}</span>
          </span>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4 flex flex-col gap-2 flex-1">
        {/* Price & Price/m² */}
        <div className="flex items-baseline justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="text-brand font-extrabold text-xl leading-none tracking-tight">{fmtPrice(x.price_vnd, x.deal)}</span>
            {ppm2 && <span className="text-xs text-[var(--ink-faint)] font-semibold">{ppm2}</span>}
          </div>
          {x.price_flag && (
            <span className="inline-flex items-center gap-1 text-overline font-bold px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/70 dark:border-amber-800/60" title="Giá có độ lệch đáng chú ý so với mặt bằng">
              <AlertCircle className="w-3 h-3" />
              Lệch giá
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="font-bold text-sm text-[var(--ink)] leading-snug line-clamp-2 group-hover:text-brand transition-colors">
          {title}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-1 text-xs text-[var(--ink-faint)] truncate">
          <MapPin className="w-3.5 h-3.5 text-brand/70 shrink-0" />
          <span className="truncate">{location}</span>
        </div>

        {/* Specs: Diện tích, Phòng ngủ, WC */}
        <div className="flex items-center gap-2 text-xs text-[var(--ink-soft)] font-medium pt-0.5">
          {x.area_m2 ? <span className="font-semibold text-[var(--ink)]">{x.area_m2} m²</span> : null}
          {x.area_m2 && (x.bedrooms || x.bathrooms) ? <span className="text-[var(--ink-faint)]">•</span> : null}
          {x.bedrooms ? <span>{x.bedrooms} PN</span> : null}
          {x.bedrooms && x.bathrooms ? <span className="text-[var(--ink-faint)]">•</span> : null}
          {x.bathrooms ? <span>{x.bathrooms} WC</span> : null}
          <span className="ml-auto text-xs text-[var(--ink-faint)] font-semibold">{PROP[x.kind]}</span>
        </div>

        {/* Footer Meta */}
        {/* thẻ hẹp (~180px, 4 cột) không đủ chỗ cho nhãn nguồn + "12 ngày trước" -> cho thời gian xuống dòng,
            nhãn giữ 1 dòng (bản cũ rounded-full bị bóp thành viên thuốc 3 dòng "Đã / xác / minh") */}
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mt-auto pt-2.5 border-t border-[var(--line)] text-xs text-[var(--ink-faint)]">
          <div className="flex items-center gap-1.5 min-w-0">
            {/* rổ hàng: nhãn nguồn = "Đã xác minh", trùng nhãn trên ảnh -> không lặp lại */}
            {!roHang && <span className={`px-1.5 py-0.5 rounded-sm whitespace-nowrap font-bold text-overline ${
              isAgent ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50" : "text-[var(--ink-soft)] bg-[var(--surface-2)]"
            }`}>
              {tenNguon(x)}
            </span>}
            {multi && (
              <span className="px-1.5 py-0.5 rounded whitespace-nowrap text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 font-semibold text-overline" title={`Cùng tin xuất hiện trên: ${(x.source_sites || []).join(", ")}`}>
                {x.source_count} nguồn
              </span>
            )}
          </div>
          {ageMin != null && (
            <span
              suppressHydrationWarning
              className="font-medium text-[var(--ink-faint)] shrink-0 whitespace-nowrap"
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
