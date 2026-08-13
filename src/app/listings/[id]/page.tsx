export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fmtPrice, PROP, AMEN, thumb } from "@/lib/format";
import type { Listing } from "@/lib/types";
import ContactForm from "./ContactForm";

export default async function ListingDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase.from("listings").select("*").eq("id", id).single();
  if (!data) notFound();
  const x = data as Listing;
  const t = thumb(x.kind);

  const details: [string, string, string][] = [
    ["🧭", "Hướng", x.direction || "-"],
    ["📜", "Pháp lý", x.legal_status || "-"],
    ["🏢", "Số tầng", x.floors ? `${x.floors} tầng` : "-"],
    ["🛋", "Nội thất", x.furnishing || "-"],
    ["🅿", "Chỗ đậu xe", x.amenities?.includes("parking") ? "Có" : "-"],
    ["🏷", "Mã tin", x.id.slice(0, 8)],
  ];

  return (
    <div>
      <Link href="/" className="text-sm text-[var(--ink-soft)] font-semibold">← Quay lại</Link>

      {/* Gallery ảnh - aspect cố định, không đè layout */}
      <div className="my-4">
        <div
          className="relative rounded-2xl overflow-hidden aspect-[16/9] max-h-[460px] grid place-items-center text-white text-5xl"
          style={{ background: t.bg }}
        >
          {x.images?.[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={x.images[0]} alt={x.title} className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <span>{t.icon}</span>
          )}
        </div>
        {x.images && x.images.length > 1 && (
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mt-2">
            {x.images.slice(1, 6).map((img, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={img} alt="" className="aspect-[4/3] w-full object-cover rounded-lg" />
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-between gap-4 items-start">
        <div>
          <h1 className="prata text-2xl md:text-3xl">{x.title}</h1>
          <div className="text-[var(--ink-soft)] text-sm mt-1">
            📍 {[x.address, x.district, x.province].filter(Boolean).join(", ") || "-"}
          </div>
        </div>
        <div className="prata text-2xl text-brand">{fmtPrice(x.price_vnd, x.deal)}</div>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 py-4 my-3 border-y border-[var(--line)] text-sm">
        <span>🛏 {x.bedrooms ?? 0} phòng ngủ</span>
        <span>🛁 {x.bathrooms ?? 0} phòng tắm</span>
        <span>📐 {x.area_m2 ?? "-"} m²</span>
        <span>🏠 {PROP[x.kind]}</span>
        <span>{x.deal === "ban" ? "🏷 Bán" : "🔑 Cho thuê"}</span>
        {x.ai_score ? <span className="text-amber-600 font-semibold">★ {x.ai_score}/100</span> : null}
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6 mt-5">
        <div className="flex flex-col gap-4">
          {x.price_flag ? (
            <div className="card rounded-xl p-4 border-red-500/40 text-red-600 text-sm">
              ⚠️ Cảnh báo giá: tin này {x.price_flag.reason === "cao_hon" ? "cao" : "thấp"} hơn{" "}
              {x.price_flag.deviation_pct}% so với trung vị khu vực ({x.price_flag.distinct_posters} người
              đăng cùng khu). Nên kiểm tra kỹ.
            </div>
          ) : null}
          <div className="card rounded-2xl p-5">
            <h3 className="font-bold mb-3">Mô tả</h3>
            <p className="text-[var(--ink-soft)] whitespace-pre-line text-sm leading-relaxed">
              {x.description || "(Không có mô tả)"}
            </p>
          </div>
          <div className="card rounded-2xl p-5">
            <h3 className="font-bold mb-3">Chi tiết bất động sản</h3>
            <div className="grid grid-cols-2 gap-4">
              {details.map((d) => (
                <div key={d[1]} className="flex gap-3">
                  <span className="text-brand">{d[0]}</span>
                  <div>
                    <div className="text-xs text-[var(--ink-soft)] uppercase">{d[1]}</div>
                    <div className="font-semibold text-sm">{d[2]}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {x.amenities?.length ? (
            <div className="card rounded-2xl p-5">
              <h3 className="font-bold mb-3">Tiện ích</h3>
              <div className="flex flex-wrap gap-2 text-sm">
                {x.amenities.map((a) => (
                  <span key={a} className="px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--bg)]">
                    {AMEN[a] || a}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          <div className="card rounded-2xl p-5">
            <h3 className="font-bold mb-2">Vị trí</h3>
            <div className="text-sm text-[var(--ink-soft)] mb-3">
              📍 {[x.address, x.district, x.province].filter(Boolean).join(", ") || "-"}
            </div>
            <div className="h-56 rounded-xl grid place-items-center text-[var(--ink-soft)] bg-[var(--bg)] border border-[var(--line)]">
              🗺️ Khung bản đồ Google Maps / Mapbox (geocode ở bản thật)
            </div>
          </div>
        </div>

        <div>
          <div className="card rounded-2xl p-5">
            <h3 className="font-bold mb-3">Liên hệ người bán</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-full grid place-items-center text-white font-bold bg-gradient-to-br from-brand to-brand-2">
                {(x.contact_phone ? "N" : "?").toUpperCase()}
              </div>
              <div>
                <div className="font-bold text-sm">Người bán</div>
                <div className="text-xs text-[var(--ink-soft)] font-mono">
                  {x.contact_phone || "Ẩn theo NĐ13"}
                </div>
              </div>
            </div>
            <ContactForm listingId={x.id} listingTitle={x.title} />
            {x.source_url && x.source_url !== "#" ? (
              <a
                href={x.source_url}
                target="_blank"
                rel="noopener nofollow"
                className="block text-center mt-3 text-sm text-brand font-semibold"
              >
                Xem bài gốc trên {x.source_site || "nguồn"} →
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
