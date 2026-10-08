import Link from "next/link";
import type { Listing } from "@/lib/types";
import { fmtPrice, fmtPpm2, fresh, PROP, thumb } from "@/lib/format";
import FavButton from "./FavButton";
import SafeImg from "./SafeImg";
import { thongTinAnh, layVideo } from "@/lib/img";
import { laTinDocQuyen, cheSoVanBan } from "@/lib/doc-quyen";
import { laRoHang, tenNguon } from "@/lib/ro-hang";

// Dòng kết quả kiểu batdongsan.com.vn: ảnh lớn + dải ảnh nhỏ bên trái,
// giá + giá/m² + diện tích + PN, mô tả 2 dòng, chân tin nguồn + thời gian.
export default function ListingRow({ x }: { x: Listing }) {
  const t = thumb(x.kind);
  const vids = new Set(layVideo(x.images));   // video rổ hàng nằm cuối images - không đưa vào dải ảnh
  const imgs = (x.images || []).filter((u) => !vids.has(u)).slice(0, 4);
  // giá/m² cho cả bán lẫn thuê (batdongsan hiện trên mọi card)
  const ppm2 = x.price_per_m2 && x.price_per_m2 > 0 ? fmtPpm2(x.price_per_m2) : null;
  const loc = [x.district, x.province].filter(Boolean).join(", ");
  const ageMin = x.first_seen_at ? Math.round((Date.now() - new Date(x.first_seen_at).getTime()) / 60000) : null;
  const ago = ageMin != null ? fresh(ageMin) : null;
  const isNew = ageMin != null && ageMin < 24 * 60;
  const multi = (x.source_count ?? 1) > 1;

  return (
    // MỘT link cho mỗi tin; bên trong phần điện thoại (sm:hidden) và desktop (hidden sm:*) tách riêng.
    // Không render 2 link: link ẩn đứng trước làm locator/bot "tin đầu tiên" trỏ vào phần không hiện.
    <Link href={`/listings/${x.id}`} className="card rounded-xl overflow-hidden flex flex-row gap-3 p-2 sm:gap-0 sm:p-0 active:bg-[var(--surface-2)] sm:active:bg-transparent hover:border-[var(--line-strong)] hover:shadow-md transition-all group">
      <MobileThumb x={x} />
      <MobileBody x={x} ago={ago} isNew={isNew} />
      {/* Media: 1 ảnh lớn + tối đa 3 ảnh nhỏ */}
      {/* UX audit 16/8: dải ảnh cao ~400px/dòng (desktop) và chiếm cả màn hình (mobile) -> 1,5 tin/màn.
          Cap chiều cao: mobile 176px, desktop 208px - ~3 tin/màn như batdongsan. */}
      <div className="hidden sm:block sm:w-[300px] shrink-0 relative">
        {imgs.length ? (
          <div className={`grid gap-0.5 h-44 sm:h-52 ${imgs.length > 1 ? "grid-rows-[2fr_1fr]" : ""}`}>
            <SafeImg src={imgs[0]} alt={laTinDocQuyen(x) ? cheSoVanBan(x.title) : x.title} className="w-full h-full object-cover" />
            {imgs.length > 1 && (
              <div className={`grid gap-0.5 ${imgs.length >= 4 ? "grid-cols-3" : imgs.length === 3 ? "grid-cols-2" : "grid-cols-1"}`}>
                {imgs.slice(1).map((u, i) => (
                  <SafeImg key={i} src={u} alt="" className="w-full h-full object-cover" />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="h-44 sm:h-52 grid place-items-center text-white text-3xl" style={{ background: t.bg }}>{t.icon}</div>
        )}
        <span className="absolute top-2 left-2 flex items-center gap-1">
          {laTinDocQuyen(x) && (
            <span className="text-[0.65rem] font-extrabold px-1.5 py-0.5 rounded bg-emerald-600 text-white" title="Tin đăng đã xác minh thông tin & pháp lý thực tế">✓ ĐÃ XÁC MINH</span>
          )}
          <span className="text-[0.7rem] font-bold px-2 py-0.5 rounded bg-black/55 text-white">
            {x.deal === "ban" ? "Để bán" : "Cho thuê"}
          </span>
          {isNew && <span className="text-[0.65rem] font-bold px-1.5 py-0.5 rounded bg-emerald-500 text-white" title="Radar thấy tin trong 24 giờ qua">Mới</span>}
          {x.price_flag && <span className="text-[0.65rem] font-bold px-1.5 py-0.5 rounded bg-red-500/90 text-white">⚠ giá lệch</span>}
        </span>
        {imgs.length > 0 && (
          <span className="absolute bottom-2 right-2 text-[0.68rem] font-semibold px-1.5 py-0.5 rounded bg-black/55 text-white">
            {thongTinAnh(x).so} ảnh{thongTinAnh(x).video ? " · ▶" : ""}
          </span>
        )}
      </div>

      {/* Nội dung */}
      <div className="hidden sm:flex flex-1 p-4 flex-col gap-1.5 min-w-0">
        <h3 className="font-semibold leading-snug line-clamp-2 group-hover:text-brand transition-colors uppercase text-[0.92rem]">
          {laTinDocQuyen(x) ? cheSoVanBan(x.title) : x.title}
        </h3>
        {/* Gerhardt-Powals: cùng lưới số (tabular) để quét & so sánh giữa các dòng */}
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 tabular-nums">
          <span className="text-brand font-extrabold text-lg">{fmtPrice(x.price_vnd, x.deal)}</span>
          {ppm2 && <span className="text-sm text-[var(--ink-soft)] font-semibold">{ppm2}</span>}
          {x.area_m2 ? <span className="text-sm text-[var(--ink-soft)] font-semibold">{x.area_m2} m²</span> : null}
          {x.bedrooms ? <span className="text-sm text-[var(--ink-soft)]">{x.bedrooms} PN</span> : null}
          {x.bathrooms ? <span className="text-sm text-[var(--ink-soft)]">{x.bathrooms} WC</span> : null}
        </div>
        <div className="text-xs text-[var(--ink-soft)] truncate">{loc || "-"}</div>
        {x.description && (
          <p className="text-xs text-[var(--ink-soft)] line-clamp-2 leading-relaxed break-words min-w-0">{laTinDocQuyen(x) ? cheSoVanBan(x.description) : x.description}</p>
        )}
        <div className="mt-auto pt-2 border-t border-[var(--line)] flex items-center gap-2 text-[0.7rem]">
          <span className={`font-bold px-1.5 py-0.5 rounded ${x.source === "agent" ? "text-emerald-600 bg-emerald-500/10" : "text-[var(--ink-soft)] bg-[var(--surface-2)]"}`}>
            {tenNguon(x)}
          </span>
          {multi && (
            <span className="font-bold px-1.5 py-0.5 rounded text-emerald-700 bg-emerald-500/10" title={`Cùng tin xuất hiện trên: ${(x.source_sites || []).join(", ")}`}>
              {x.source_count} nguồn
            </span>
          )}
          <span className="text-[var(--ink-faint)]">{PROP[x.kind]}</span>
          {x.ai_score ? <span className="text-[var(--ink-faint)]" title="Điểm đầy đủ thông tin tin đăng (0-100)">{x.ai_score}/100</span> : null}
          {/* suppressHydrationWarning: "x phút trước" server dựng (HTML cache vài phút) khác lúc trình duyệt hydrate -> React #418 (2/10) */}
          {ago && <span suppressHydrationWarning className="text-emerald-600 font-medium" title={x.first_seen_at ? `Radar thấy tin: ${new Date(x.first_seen_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}` : undefined}>{ago}</span>}
          <span className="ml-auto"><FavButton id={x.id} /></span>
        </div>
      </div>
    </Link>
  );
}

// Điện thoại (<640px): thẻ ngang gọn kiểu Mogi (29/9) - ảnh nhỏ trái, chữ phải, ~5 tin/màn.
// Bản desktop ở trên (ảnh + dải ảnh + mô tả) cao ~420px/tin khi xếp dọc trên màn hẹp -> 1,5 tin/màn.
// Bỏ mô tả, giá/m², nguồn, điểm AI: khách lướt so giá chỉ cần ảnh - tên - khu vực - DT - giá.
// Ảnh ẩn (display:none) + loading=lazy thì trình duyệt không tải -> không tải ảnh 2 lần.
function MobileThumb({ x }: { x: Listing }) {
  const t = thumb(x.kind);
  const img = x.images?.[0];
  const docQuyen = laTinDocQuyen(x);
  return (
    <div className="sm:hidden relative w-[124px] h-[104px] shrink-0 rounded-lg overflow-hidden bg-[var(--surface-2)]">
      {img ? (
        <SafeImg src={img} alt={docQuyen ? cheSoVanBan(x.title) : x.title} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full grid place-items-center text-2xl opacity-60">{t.icon}</div>
      )}
      {docQuyen && (
        <span className={`absolute top-1 left-1 text-[0.6rem] font-extrabold px-1 py-px rounded text-white ${laRoHang(x) ? "bg-amber-500" : "bg-emerald-600"}`}>
          {laRoHang(x) ? "★ Radar" : "✓ Xác thực"}
        </span>
      )}
      {thongTinAnh(x).so > 1 && (
        <span className="absolute bottom-1 right-1 text-[0.6rem] font-bold px-1 py-px rounded bg-black/55 text-white">{thongTinAnh(x).so} ảnh{thongTinAnh(x).video ? " · ▶" : ""}</span>
      )}
    </div>
  );
}

function MobileBody({ x, ago, isNew }: { x: Listing; ago: string | null; isNew: boolean }) {
  const specs = [x.area_m2 ? `${x.area_m2} m²` : null, x.bedrooms ? `${x.bedrooms} PN` : null, x.bathrooms ? `${x.bathrooms} WC` : null]
    .filter(Boolean).join(" · ") || PROP[x.kind];
  return (
    <div className="sm:hidden flex-1 min-w-0 flex flex-col gap-0.5 py-0.5">
      <h3 className="text-sm font-semibold leading-snug line-clamp-2">{laTinDocQuyen(x) ? cheSoVanBan(x.title) : x.title}</h3>
      <div className="text-xs text-[var(--ink-soft)] truncate">{x.district || x.province || "-"}</div>
      <div className="text-xs text-[var(--ink-soft)] truncate tabular-nums">{specs}</div>
      <div className="text-brand font-extrabold leading-tight tabular-nums">{fmtPrice(x.price_vnd, x.deal)}</div>
      <div className="mt-auto flex items-center gap-1.5 text-[0.68rem]">
        {isNew && <span className="font-bold px-1 rounded bg-emerald-500 text-white">Mới</span>}
        {x.price_flag && <span className="font-bold px-1 rounded bg-red-500/90 text-white">⚠ giá lệch</span>}
        {ago && <span suppressHydrationWarning className="text-[var(--ink-faint)]">{ago}</span>}
        <span className="ml-auto"><FavButton id={x.id} /></span>
      </div>
    </div>
  );
}
