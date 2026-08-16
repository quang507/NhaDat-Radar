export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fmtPrice, fresh, PROP, AMEN, thumb } from "@/lib/format";
import { cleanImages } from "@/lib/img";
import { median, percentile } from "@/lib/gemini";
import { posterReasonText, type Listing } from "@/lib/types";
import ContactForm from "./ContactForm";
import ListingMap from "@/components/ListingMap";
import ListingCard from "@/components/ListingCard";
import Gallery from "@/components/Gallery";
import PhoneReveal from "@/components/PhoneReveal";
import FavButton from "@/components/FavButton";
import AppointmentForm from "@/components/AppointmentForm";

function agoMin(iso: string | null): number | null {
  if (!iso) return null;
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

// SEO/OG: share link ra Facebook/Zalo có tiêu đề + ảnh + giá
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings").select("title,price_vnd,deal,district,province,images,description")
    .eq("id", id).single();
  if (!data) return { title: "Không tìm thấy tin - NhaDat Radar" };
  const title = `${data.title} - ${fmtPrice(data.price_vnd, data.deal)}`;
  const description = (data.description || "").slice(0, 160) ||
    `${[data.district, data.province].filter(Boolean).join(", ")} · NhaDat Radar`;
  const img = cleanImages(data.images || [])[0];
  return {
    title,
    description,
    openGraph: { title, description, ...(img ? { images: [{ url: img }] } : {}) },
  };
}

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
  const images = cleanImages(x.images || []);

  // So sánh giá + tin liên quan: cùng loại + cùng quận (song song)
  const [{ data: compRows }, { data: relRows }] = await Promise.all([
    x.district
      ? supabase.from("listings").select("price_per_m2")
          .eq("status", "published").eq("deal", x.deal).eq("kind", x.kind)
          .ilike("district", `%${x.district}%`)
          .not("price_per_m2", "is", null).gt("price_per_m2", 0).neq("id", x.id).limit(300)
      : Promise.resolve({ data: [] as { price_per_m2: number }[] }),
    supabase.from("listings").select("*")
      .eq("status", "published").eq("kind", x.kind).neq("id", x.id)
      .ilike(x.district ? "district" : "province", `%${x.district || x.province || ""}%`)
      .order("ai_score", { ascending: false, nullsFirst: false }).limit(12),
  ]);

  const ppm2s = (compRows ?? []).map((r) => Number(r.price_per_m2)).filter((v) => v > 0);
  const med = median(ppm2s), p25 = percentile(ppm2s, 25), p75 = percentile(ppm2s, 75);
  const myPpm2 = x.price_per_m2 ? Number(x.price_per_m2) : null;
  const diffPct = med && myPpm2 ? Math.round(((myPpm2 - med) / med) * 100) : null;
  const fmtPpm2 = (v: number) => (v >= 1e6 ? (v / 1e6).toFixed(1) + "tr" : Math.round(v / 1e3) + "k");

  const related = ((relRows ?? []) as Listing[]).filter((r) => r.images?.length).slice(0, 6);

  const roleGuess = x.poster_role_guess;
  const seen = agoMin(x.first_seen_at);
  const lastSeen = agoMin(x.last_seen_at ?? null);
  const isGone = x.status === "gone";
  const reasons = (x.poster_reasons || []).map(posterReasonText);
  const fmtDT = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "—";

  const details: [string, string][] = [
    ["Hướng", x.direction || "-"],
    ["Pháp lý", x.legal_status || "-"],
    ["Số tầng", x.floors ? `${x.floors} tầng` : "-"],
    ["Nội thất", x.furnishing || "-"],
    ["Chỗ đậu xe", x.amenities?.includes("parking") ? "Có" : "-"],
    ["Mã tin", x.id.slice(0, 8)],
  ];

  return (
    <div>
      <div className="flex items-center gap-3">
        <Link href="/search" className="text-sm text-[var(--ink-soft)] font-semibold">← Quay lại</Link>
        <span className="ml-auto"><FavButton id={x.id} /></span>
      </div>

      {/* Gallery + lightbox */}
      <div className="my-4">
        {images.length ? (
          <Gallery images={images} title={x.title} />
        ) : (
          <div
            className="rounded-lg overflow-hidden aspect-[16/9] max-h-[460px] grid place-items-center text-white text-5xl"
            style={{ background: t.bg }}
          >
            <span>{t.icon}</span>
          </div>
        )}
      </div>

      {isGone && (
        <div className="rounded-lg p-3 mb-3 border border-amber-500/40 bg-amber-500/10 text-sm">
          <b>Tin có thể đã giao dịch hoặc bị gỡ.</b> Radar không còn thấy tin này trên {x.source_site || "nguồn"} từ{" "}
          {lastSeen != null ? fresh(lastSeen) : "một thời gian"}. Tin đã ẩn khỏi kết quả tìm kiếm; giữ lại để tham khảo giá.
        </div>
      )}
      <div className="flex flex-wrap justify-between gap-4 items-start">
        <div>
          <h1 className="prata text-2xl md:text-3xl">{x.title}</h1>
          <div className="text-[var(--ink-soft)] text-sm mt-1">
            📍 {[x.address, x.district, x.province].filter(Boolean).join(", ") || "-"}
          </div>
        </div>
        <div className="text-right">
          <div className="prata text-2xl text-brand">{fmtPrice(x.price_vnd, x.deal)}</div>
          {myPpm2 ? <div className="text-xs text-[var(--ink-faint)] font-semibold">{fmtPpm2(myPpm2)}/m²</div> : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 py-4 my-3 border-y border-[var(--line)] text-sm">
        <span><b>{x.bedrooms ?? 0}</b> phòng ngủ</span>
        <span><b>{x.bathrooms ?? 0}</b> phòng tắm</span>
        <span><b>{x.area_m2 ?? "-"}</b> m²</span>
        <span>{PROP[x.kind]}</span>
        <span>{x.deal === "ban" ? "Bán" : "Cho thuê"}</span>
        {x.ai_score ? <span className="text-[var(--ink-soft)]" title="Điểm đầy đủ thông tin: giá, diện tích, ảnh, pháp lý, mô tả… (không phải xác minh)">Điểm tin <b>{x.ai_score}/100</b></span> : null}
        {(x.source_count ?? 1) > 1 ? (
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700" title={`Cùng tin này xuất hiện trên: ${(x.source_sites || []).join(", ")}`}>
            ✓ Xuất hiện trên {x.source_count} nguồn
          </span>
        ) : null}
      </div>

      <div className="grid lg:grid-cols-[1fr_360px] gap-6 mt-5">
        <div className="flex flex-col gap-4">
          {/* So sánh giá với mặt bằng khu vực (data thật) */}
          {diffPct != null && med && (
            <div className={`card rounded-lg p-4 text-sm ${
              diffPct <= -5 ? "border-emerald-500/40 bg-emerald-500/5"
              : diffPct >= 10 ? "border-red-500/40 bg-red-500/5"
              : "border-[var(--line)]"
            }`}>
              <div className="flex items-center gap-2 font-bold mb-1">
                So sánh giá
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                  diffPct <= -5 ? "bg-emerald-500/15 text-emerald-600"
                  : diffPct >= 10 ? "bg-red-500/15 text-red-600"
                  : "bg-[var(--surface-2)] text-[var(--ink-soft)]"
                }`}>
                  {diffPct <= -5 ? `Rẻ hơn mặt bằng ~${Math.abs(diffPct)}%` : diffPct >= 10 ? `Cao hơn mặt bằng ~${diffPct}%` : "Ngang mặt bằng"}
                </span>
              </div>
              <p className="text-[var(--ink-soft)]">
                Giá/m² tin này: <b>{fmtPpm2(myPpm2!)}/m²</b> — trung vị {ppm2s.length} tin {PROP[x.kind].toLowerCase()} {x.deal === "ban" ? "bán" : "cho thuê"} tại {x.district}: <b>{fmtPpm2(med)}/m²</b>
                {p25 && p75 ? <> · khoảng phổ biến {fmtPpm2(p25)} – {fmtPpm2(p75)}/m²</> : null}.
                <span className="text-[var(--ink-faint)]"> Dựa trên {ppm2s.length} tin đang hiển thị cùng loại tại {x.district}. Chỉ mang tính tham khảo, không phải định giá.</span>
              </p>
            </div>
          )}

          {/* Dấu hiệu chính chủ / môi giới — từ DỮ LIỆU (tần suất tài khoản, nguồn ghi nhận, nội dung), nêu rõ lý do */}
          {roleGuess === "moi_gioi" && (
            <div className="card rounded-lg p-4 border-sky-500/40 bg-sky-500/5 text-sm">
              <div className="font-bold mb-1">Có dấu hiệu môi giới</div>
              {reasons.length ? (
                <ul className="list-disc pl-5 text-[var(--ink-soft)] mb-1">{reasons.map((r) => <li key={r}>{r}</li>)}</ul>
              ) : null}
              <p className="text-[var(--ink-faint)] text-xs">
                Nhận định từ dữ liệu Radar (tần suất đăng, nguồn ghi nhận, nội dung tin) — không phải xác minh danh tính. Hãy kiểm tra kỹ trước khi đặt cọc.
              </p>
            </div>
          )}
          {roleGuess === "chu_nha" && (
            <div className="card rounded-lg p-4 border-emerald-500/40 bg-emerald-500/5 text-sm">
              <div className="font-bold mb-1">Có dấu hiệu chính chủ</div>
              {reasons.length ? (
                <ul className="list-disc pl-5 text-[var(--ink-soft)] mb-1">{reasons.map((r) => <li key={r}>{r}</li>)}</ul>
              ) : null}
              <p className="text-[var(--ink-faint)] text-xs">Nhận định từ dữ liệu Radar, không phải xác minh. Vẫn nên xác minh sổ/giấy tờ khi giao dịch.</p>
            </div>
          )}
          {x.price_flag ? (
            <div className="card rounded-lg p-4 border-red-500/40 text-red-600 text-sm">
              ⚠️ Cảnh báo giá: tin này {x.price_flag.reason === "cao_hon" ? "cao" : "thấp"} hơn{" "}
              {Math.abs(x.price_flag.deviation_pct)}% so với trung vị {x.price_flag.cluster_size} tin cùng loại trong quận
              ({x.price_flag.distinct_posters} người đăng khác nhau, so theo {x.price_flag.basis === "gia" ? "giá" : "giá/m²"}). Nên kiểm tra kỹ.
            </div>
          ) : null}

          <div className="card rounded-lg p-5">
            <h3 className="font-bold mb-3">Mô tả</h3>
            <p className="text-[var(--ink-soft)] whitespace-pre-line text-sm leading-relaxed">
              {x.description || "(Không có mô tả)"}
            </p>
          </div>
          <div className="card rounded-lg p-5">
            <h3 className="font-bold mb-3">Chi tiết bất động sản</h3>
            <div className="grid grid-cols-2 gap-4">
              {details.map((d) => (
                <div key={d[0]} className="border-l-2 border-[var(--line)] pl-3">
                  <div className="text-xs text-[var(--ink-soft)] uppercase">{d[0]}</div>
                  <div className="font-semibold text-sm">{d[1]}</div>
                </div>
              ))}
            </div>
          </div>
          {x.amenities?.length ? (
            <div className="card rounded-lg p-5">
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
          <div className="card rounded-lg p-5">
            <h3 className="font-bold mb-2">Vị trí</h3>
            <div className="text-sm text-[var(--ink-soft)] mb-3">
              📍 {[x.address, x.district, x.province].filter(Boolean).join(", ") || "-"}
            </div>
            {x.lat != null && x.lng != null ? (
              <ListingMap lat={x.lat} lng={x.lng} title={x.title} />
            ) : (
              <div className="h-56 rounded-xl grid place-items-center text-[var(--ink-soft)] bg-[var(--bg)] border border-[var(--line)] text-sm">
                📍 Tin này chưa có toạ độ chính xác
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="card rounded-lg p-5">
            <h3 className="font-bold mb-3">Liên hệ người bán</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-lg grid place-items-center text-white font-bold bg-[#16233a] text-xs">
                {x.source === "agent" ? "BÁN" : "TIN"}
              </div>
              <div>
                <div className="font-bold text-sm">{x.contact_name || (x.source === "agent" ? "Người bán tự đăng" : "Người đăng tin")}</div>
                <div className="text-xs text-[var(--ink-soft)]">
                  {x.contact_phone ? "SĐT được che, bấm để xem" : x.phone_masked ? "SĐT che 4 số cuối — số đầy đủ ở bài gốc" : "SĐT ẩn theo NĐ13 — xem bài gốc"}
                </div>
              </div>
            </div>
            {x.contact_phone && <div className="mb-3"><PhoneReveal phone={x.contact_phone} /></div>}
            {!x.contact_phone && x.phone_masked && (
              <div className="mb-3 font-mono text-lg font-bold tracking-wider">{x.phone_masked}</div>
            )}
            {x.agent_id && (
              <Link
                href={`/tin-nhan?listing=${x.id}&agent=${x.agent_id}`}
                className="btn w-full text-center block mb-3"
              >
                Nhắn tin với người bán
              </Link>
            )}
            <ContactForm listingId={x.id} listingTitle={x.title} />
            {x.agent_id && (
              <div className="mt-4 pt-4 border-t border-[var(--line)]">
                <AppointmentForm listingId={x.id} agentId={x.agent_id} />
              </div>
            )}
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

          {/* Độ mới của tin — 3 mốc: đăng trên nguồn / Radar thấy lần đầu / thấy gần nhất */}
          <div className="card rounded-lg p-5 text-sm">
            <h3 className="font-bold mb-2">Độ mới của tin</h3>
            <div className="grid grid-cols-[1fr_auto] gap-y-1.5">
              {x.posted_at ? (<>
                <span className="text-[var(--ink-soft)]">Đăng trên {x.source_site || "nguồn"}</span>
                <span className="font-semibold">{fmtDT(x.posted_at)}</span>
              </>) : null}
              <span className="text-[var(--ink-soft)]">Radar thấy tin</span>
              <span className="font-semibold" title={fmtDT(x.first_seen_at)}>{seen != null ? fresh(seen) : "—"}</span>
              <span className="text-[var(--ink-soft)]">Thấy gần nhất</span>
              <span className={`font-semibold ${isGone ? "text-amber-600" : ""}`} title={fmtDT(x.last_seen_at ?? x.crawled_at)}>
                {lastSeen != null ? fresh(lastSeen) : (x.crawled_at ? fmtDT(x.crawled_at) : "—")}
                {x.crawl_count && x.crawl_count > 1 ? <span className="text-[var(--ink-faint)] font-normal"> · {x.crawl_count} lần</span> : null}
              </span>
              <span className="text-[var(--ink-soft)]">Nguồn</span>
              <span className="font-semibold">
                {x.source === "agent" ? "Tự đăng" : (x.source_sites && x.source_sites.length > 1 ? x.source_sites.join(" + ") : x.source_site || "crawl")}
              </span>
              {x.trust_score ? (<>
                <span className="text-[var(--ink-soft)]" title="Chấm theo mức đầy đủ dữ liệu: ảnh, pháp lý, mô tả, giá & diện tích, dấu hiệu chính chủ — không phải xác minh">Độ đầy đủ tin</span>
                <span className="font-semibold">{x.trust_score}/100</span>
              </>) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Tin liên quan */}
      {related.length > 0 && (
        <section className="mt-12">
          <h2 className="prata text-xl mb-4">
            {PROP[x.kind]} liên quan tại {x.district || x.province}
          </h2>
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]">
            {related.map((r) => <ListingCard key={r.id} x={r} />)}
          </div>
        </section>
      )}
    </div>
  );
}
