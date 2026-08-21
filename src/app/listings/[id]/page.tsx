export const dynamic = "force-dynamic";

import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LISTING_COLS, LISTING_CARD_COLS } from "@/lib/cols";
import { fmtPrice, fmtPpm2, fresh, PROP, AMEN, thumb } from "@/lib/format";
import { cleanImages } from "@/lib/img";
import { median, percentile } from "@/lib/gemini";
import { posterReasonText, type Listing } from "@/lib/types";
import ContactForm from "./ContactForm";
import ReportButton from "./ReportButton";
import PriceTrend from "@/components/PriceTrend";
import { areaPath } from "@/lib/slug";
import { nhanTinh } from "@/lib/sap-nhap";
import ScoreInfo from "@/components/ScoreInfo";
import LegalHint from "@/components/LegalHint";
import MortgageMini from "@/components/MortgageMini";
import RecentlyViewed, { RecentlyViewedTracker } from "@/components/RecentlyViewed";
import ListingMap from "@/components/ListingMap";
import ListingCard from "@/components/ListingCard";
import Gallery from "@/components/Gallery";
import PhoneReveal from "@/components/PhoneReveal";
import SourceBadge from "@/components/SourceBadge";
import TuVanRadar from "@/components/TuVanRadar";
import DangNhapDeXem from "@/components/DangNhapDeXem";
import RichText from "@/components/RichText";
import FavButton from "@/components/FavButton";
import AppointmentForm from "@/components/AppointmentForm";
import { setListingStatusFromDetail, deleteListingFromDetail } from "@/app/admin/actions";

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
  const { data, error } = await supabase.from("listings").select(LISTING_COLS).eq("id", id).single();
  // 42703 (cột trong LISTING_COLS chưa có migration - đã xảy ra, xem 015) mà nuốt im lặng thì
  // MỌI tin ra 404, SEO de-index, không dấu vết. Log để còn thấy trong Vercel Logs; PGRST116
  // (không có hàng) mới là 404 thật.
  if (error && error.code !== "PGRST116") console.error("listing detail:", id, error.code, error.message);
  if (!data) notFound();
  const x = data as Listing;
  const t = thumb(x.kind);
  const images = cleanImages(x.images || []);

  // 17/8: bỏ duyệt trước - tin lên thẳng, nên admin cần nút gỡ/xoá NGAY tại trang tin
  const { data: { user } } = await supabase.auth.getUser();
  let isAdmin = false;
  if (user) {
    const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    isAdmin = prof?.role === "admin";
  }

  // So sánh giá + tin liên quan (cùng loại + cùng quận) + tin khác của cùng người đăng (song song)
  const [{ data: compRows }, { data: relRows }, { data: posterRows, count: posterCount }] = await Promise.all([
    x.district
      ? supabase.from("listings").select("price_per_m2")
          .eq("status", "published").eq("deal", x.deal).eq("kind", x.kind)
          .eq("district", x.district)
          .not("price_per_m2", "is", null).gt("price_per_m2", 0).neq("id", x.id).limit(300)
      : Promise.resolve({ data: [] as { price_per_m2: number }[] }),
    // audit 16/8: thiếu cả quận lẫn tỉnh thì ilike "%%" trả tin toàn quốc -> chỉ hỏi khi có khu vực; ảnh không rỗng lọc ở DB
    (x.district || x.province)
      ? supabase.from("listings").select(LISTING_CARD_COLS)
          .eq("status", "published").eq("kind", x.kind).neq("id", x.id)
          .eq(x.district ? "district" : "province", x.district || x.province!)
          .not("images", "eq", "{}")
          .order("ai_score", { ascending: false, nullsFirst: false }).limit(12)
      : Promise.resolve({ data: [] as Listing[] }),
    x.poster_key
      ? supabase.from("listings").select(LISTING_CARD_COLS, { count: "exact" })
          .eq("status", "published").eq("poster_key", x.poster_key).neq("id", x.id)
          .order("first_seen_at", { ascending: false }).limit(6)
      : Promise.resolve({ data: [] as Listing[], count: 0 }),
  ]);
  const posterOthers = ((posterRows ?? []) as Listing[]);

  const ppm2s = (compRows ?? []).map((r) => Number(r.price_per_m2)).filter((v) => v > 0);
  // UX audit 16/8: từng hiện "Cao hơn mặt bằng ~35%" dựa trên 1 tin -> vô nghĩa & gây hiểu lầm.
  // Chỉ so sánh khi có >=5 tin cùng loại trong quận; ít hơn thì nói thẳng "chưa đủ dữ liệu".
  const MIN_COMPS = 5;
  const enoughComps = ppm2s.length >= MIN_COMPS;
  const med = enoughComps ? median(ppm2s) : null, p25 = enoughComps ? percentile(ppm2s, 25) : null, p75 = enoughComps ? percentile(ppm2s, 75) : null;
  const myPpm2 = x.price_per_m2 ? Number(x.price_per_m2) : null;
  const diffPct = med && myPpm2 ? Math.round(((myPpm2 - med) / med) * 100) : null;

  const related = ((relRows ?? []) as Listing[]).filter((r) => r.images?.length).slice(0, 6);

  const roleGuess = x.poster_role_guess;
  const seen = agoMin(x.first_seen_at);
  const lastSeen = agoMin(x.last_seen_at ?? null);
  const isGone = x.status === "gone";
  const isCrawl = x.source === "crawl";
  const reasons = (x.poster_reasons || []).map(posterReasonText);
  const fmtDT = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" }) : "-";

  // Chỉ hiện ô CÓ dữ liệu. Trước đây danh sách cứng 6 ô nên tin đất nền hiện "Nội thất -",
  // "Số tầng -", "Chỗ đậu xe -" - vừa vô nghĩa vừa làm tin trông thiếu thốn. Mỗi loại BĐS
  // có bộ thông số riêng (đất: mặt tiền/chiều dài/hình dáng; nhà: số tầng/nội thất/thang máy).
  const specs = (x.specs ?? null) as Record<string, string> | null;
  // các nhãn đã có ô riêng ở trên -> không lặp lại ở phần thông số nguồn
  const daCo = /^(hướng (nhà|đất)|pháp lý|giấy tờ pháp lý|loại sổ|tình trạng sổ|số tầng|nội thất|tổng diện tích đất|diện tích)/i;

  // Sáp nhập 1/7/2025: người đăng lúc ghi tên CŨ (quen miệng), lúc ghi tên MỚI. Các sàn lớn
  // đều hiện CẢ HAI để ai đọc cũng nhận ra chỗ đó - chotot: "Quận 11, TP.HCM (Phường Phú Thọ,
  // TP.HCM mới)", guland: "Tây Ninh (Mới) · Long An". Ta làm tương tự ở mức TỈNH (mức phường
  // cần bộ dữ liệu vài nghìn dòng, chưa có).
  const diaChiDayDu = (addr: string | null, quan: string | null, tinh: string | null) =>
    [addr, quan, nhanTinh(tinh)].filter(Boolean).join(", ") || "-";

  const details: [string, ReactNode][] = [
    ...(x.direction ? [["Hướng", x.direction] as [string, ReactNode]] : []),
    ...(x.legal_status ? [["Pháp lý", <LegalHint key="legal" value={x.legal_status} />] as [string, ReactNode]] : []),
    ...(x.floors ? [["Số tầng", `${x.floors} tầng`] as [string, ReactNode]] : []),
    ...(x.furnishing ? [["Nội thất", x.furnishing] as [string, ReactNode]] : []),
    ...(x.amenities?.includes("parking") ? [["Chỗ đậu xe", "Có"] as [string, ReactNode]] : []),
    // thông số riêng của nguồn (guland: mặt tiền, chiều dài, hình dáng đất, số mặt tiếp giáp…)
    ...Object.entries(specs || {})
      .filter(([k, v]) => v && String(v).trim() !== "-" && !daCo.test(k))
      .slice(0, 14)
      .map(([k, v]) => [k, String(v)] as [string, ReactNode]),
    ["Mã tin", x.id.slice(0, 8)],
  ];

  return (
    <div>
      <div className="flex items-center gap-3">
        <Link href="/search" className="text-sm text-[var(--ink-soft)] font-semibold">‹ Quay lại</Link>
        <span className="ml-auto"><FavButton id={x.id} /></span>
      </div>

      {/* Thanh admin: gỡ tin không liên quan / kém chất lượng tại chỗ (chỉ admin thấy) */}
      {isAdmin && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-xs">
          <span className="font-bold text-amber-700">🛡 Admin</span>
          <span className="text-[var(--ink-soft)]">tin đang <b>{x.status}</b></span>
          <span className="ml-auto flex items-center gap-2">
            <form action={setListingStatusFromDetail}>
              <input type="hidden" name="id" value={x.id} />
              <input type="hidden" name="status" value={x.status === "hidden" ? "published" : "hidden"} />
              <button className="btn !py-1 text-xs" type="submit">{x.status === "hidden" ? "Hiện lại" : "Ẩn tin"}</button>
            </form>
            <form action={deleteListingFromDetail}>
              <input type="hidden" name="id" value={x.id} />
              <button className="btn !py-1 text-xs !text-red-600" type="submit">Xoá hẳn</button>
            </form>
          </span>
        </div>
      )}

      {/* Breadcrumb + tiêu đề + giá TRÊN gallery: khách từ Google phải thấy "tin gì, giá bao nhiêu" ngay màn hình đầu
          (UX audit 16/8: trước đây màn hình đầu chỉ có ảnh, giá/tiêu đề nằm dưới fold) */}
      <nav className="text-xs text-[var(--ink-soft)] mt-2 flex flex-wrap gap-1">
        <Link href="/" className="hover:text-brand">Trang chủ</Link><span>/</span>
        <Link href={x.deal === "ban" ? "/nha-dat-ban" : "/nha-dat-cho-thue"} className="hover:text-brand">{x.deal === "ban" ? "Mua bán" : "Cho thuê"}</Link>
        {x.province ? <><span>/</span><Link href={areaPath(x.deal, x.province)} className="hover:text-brand">{x.province}</Link></> : null}
        {x.province && x.district ? <><span>/</span><Link href={areaPath(x.deal, x.province, x.district)} className="hover:text-brand">{x.district}</Link></> : null}
      </nav>
      {isGone && (
        <div className="rounded-lg p-3 my-3 border border-amber-500/40 bg-amber-500/10 text-sm">
          <b>Tin có thể đã giao dịch hoặc bị gỡ.</b> Radar không còn thấy tin này trên {x.source_site || "nguồn"} từ{" "}
          {lastSeen != null ? fresh(lastSeen) : "một thời gian"}. Tin đã ẩn khỏi kết quả tìm kiếm; giữ lại để tham khảo giá.
        </div>
      )}
      <div className="flex flex-wrap justify-between gap-4 items-start mt-2">
        <div className="min-w-0">
          <h1 className="prata text-xl md:text-3xl leading-tight">{x.title}</h1>
          <div className="text-[var(--ink-soft)] text-sm mt-1">
            📍 {diaChiDayDu(x.address, x.district, x.province)}
          </div>
          {/* ISO 9241-110: nguồn + thời điểm đăng + link gốc thấy ngay dưới tiêu đề (không phải kéo xuống "Độ mới của tin") */}
          <SourceBadge source={x.source} sourceSite={x.source_site} sourceUrl={x.source_url} postedAt={x.posted_at} firstSeenAt={x.first_seen_at} contactName={x.contact_name} />
        </div>
        <div className="text-right shrink-0">
          <div className="prata text-2xl text-brand">{fmtPrice(x.price_vnd, x.deal)}</div>
          {myPpm2 ? <div className="text-xs text-[var(--ink-faint)] font-semibold">{fmtPpm2(myPpm2)}</div> : null}
        </div>
      </div>

      {/* Gallery + lightbox - cap chiều cao để không đẩy hết nội dung xuống dưới fold */}
      <div className="my-4 [&_img]:max-h-[420px]">
        {images.length ? (
          <Gallery images={images} title={x.title} />
        ) : (
          <div
            className="rounded-lg overflow-hidden aspect-[16/9] max-h-[420px] grid place-items-center text-white text-5xl"
            style={{ background: t.bg }}
          >
            <span>{t.icon}</span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 py-4 my-3 border-y border-[var(--line)] text-sm">
        {/* chỉ hiện khi có số - "0 phòng ngủ" cho đất nền là vô nghĩa (UX audit) */}
        {x.bedrooms ? <span><b>{x.bedrooms}</b> phòng ngủ</span> : null}
        {x.bathrooms ? <span><b>{x.bathrooms}</b> phòng tắm</span> : null}
        <span><b>{x.area_m2 ?? "-"}</b> m²</span>
        <span>{PROP[x.kind]}</span>
        <span>{x.deal === "ban" ? "Bán" : "Cho thuê"}</span>
        <ScoreInfo score={x.ai_score} trust={x.trust_score} />
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
                Giá/m² tin này: <b>{fmtPpm2(myPpm2!)}</b> - trung vị {ppm2s.length} tin {PROP[x.kind].toLowerCase()} {x.deal === "ban" ? "bán" : "cho thuê"} tại {x.district}: <b>{fmtPpm2(med)}</b>
                {p25 && p75 ? <> · khoảng phổ biến {fmtPpm2(p25)} - {fmtPpm2(p75)}/m²</> : null}.
                <span className="text-[var(--ink-faint)]"> Dựa trên {ppm2s.length} tin đang hiển thị cùng loại tại {x.district}. Chỉ mang tính tham khảo, không phải định giá.</span>
              </p>
            </div>
          )}
          {!enoughComps && myPpm2 && x.district ? (
            <div className="card rounded-lg p-4 text-sm text-[var(--ink-soft)]">
              <b className="text-[var(--ink)]">So sánh giá:</b> chưa đủ dữ liệu - mới có {ppm2s.length} tin {PROP[x.kind].toLowerCase()} {x.deal === "ban" ? "bán" : "cho thuê"} khác tại {x.district} (cần ≥{MIN_COMPS}). Radar không đưa ra kết luận khi mẫu quá nhỏ.
            </div>
          ) : null}
          {/* Xu hướng giá khu vực từ price_history (snapshot mỗi sáng) - trước đây bảng có mà chi tiết tin không dùng */}
          {x.province ? <PriceTrend province={x.province} district={x.district} kind={x.kind} deal={x.deal} /> : null}

          {/* Dấu hiệu chính chủ / môi giới - từ DỮ LIỆU (tần suất tài khoản, nguồn ghi nhận, nội dung), nêu rõ lý do */}
          {roleGuess === "moi_gioi" && (
            <div className="card rounded-lg p-4 border-sky-500/40 bg-sky-500/5 text-sm">
              <div className="font-bold mb-1">Có dấu hiệu môi giới</div>
              {reasons.length ? (
                <ul className="list-disc pl-5 text-[var(--ink-soft)] mb-1">{reasons.map((r) => <li key={r}>{r}</li>)}</ul>
              ) : null}
              <p className="text-[var(--ink-faint)] text-xs">
                Nhận định từ dữ liệu Radar (tần suất đăng, nguồn ghi nhận, nội dung tin) - không phải xác minh danh tính. Hãy kiểm tra kỹ trước khi đặt cọc.
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
            {/* 17/8: trước dùng whitespace-pre-line -> tin dài (nhất là bài FB) thành khối chữ liền.
                RichText tách đoạn, và bài nào có "- " thì thành gạch đầu dòng cho dễ quét. */}
            <RichText text={x.description || ""} className="[&_p]:text-[var(--ink)] [&_p]:text-base [&_li]:text-base" />
          </div>
          {/* Công cụ ra quyết định tại chỗ (ISO 9241-110): trả góp cho tin bán */}
          {x.deal === "ban" && x.price_vnd && x.price_vnd >= 3e8 ? <MortgageMini price={x.price_vnd} /> : null}
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
              📍 {diaChiDayDu(x.address, x.district, x.province)}
            </div>
            {x.lat != null && x.lng != null ? (
              <>
                <ListingMap lat={x.lat} lng={x.lng} title={x.title} />
                {/* Tiện ích quanh đây (ISO 9241-110): mở Google Maps tìm quanh toạ độ - không cần API trả phí */}
                <div className="flex flex-wrap gap-2 mt-3 text-xs">
                  <span className="text-[var(--ink-soft)] self-center">Quanh đây:</span>
                  {[["Trường học", "trường học"], ["Bệnh viện", "bệnh viện"], ["Chợ / siêu thị", "chợ siêu thị"], ["Bến xe buýt", "trạm xe buýt"]].map(([label, q]) => (
                    <a key={q} href={`https://www.google.com/maps/search/${encodeURIComponent(q)}/@${x.lat},${x.lng},15z`} target="_blank" rel="noopener" className="btn !py-1.5 !px-2.5 text-xs">{label}</a>
                  ))}
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${x.lat},${x.lng}`} target="_blank" rel="noopener" className="btn !py-1.5 !px-2.5 text-xs">Chỉ đường</a>
                </div>
              </>
            ) : (
              <div className="h-56 rounded-xl grid place-items-center text-[var(--ink-soft)] bg-[var(--bg)] border border-[var(--line)] text-sm">
                📍 Tin này chưa có toạ độ chính xác
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="card rounded-lg p-5" id="lien-he">
            <h3 className="font-bold mb-3">{isCrawl ? "Liên hệ" : "Liên hệ người bán"}</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-11 h-11 rounded-lg grid place-items-center text-white font-bold bg-[#16233a] text-xs">
                {x.source === "agent" ? "BÁN" : "TIN"}
              </div>
              <div>
                <div className="font-bold text-sm">{x.contact_name || (x.source === "agent" ? "Người bán tự đăng" : `Người đăng trên ${x.source_site || "nguồn"}`)}</div>
                <div className="text-xs text-[var(--ink-soft)]">
                  {(x.contact_phone || x.phone_masked) && !user ? "Đăng nhập để xem SĐT" : x.contact_phone ? "SĐT được che, bấm để xem" : x.phone_masked ? "SĐT che 4 số cuối - số đầy đủ ở bài gốc" : "SĐT ẩn theo NĐ13 - xem bài gốc"}
                </div>
              </div>
            </div>
            {/* SĐT người đăng chỉ hiện sau ĐĂNG NHẬP (mô hình Homigo, miễn phí) - khách vãng lai
                thấy nút mở popup đăng ký. Hotline Radar bên dưới thì KHÔNG chặn: đó là kênh lead. */}
            {user && x.contact_phone && <div className="mb-3"><PhoneReveal phone={x.contact_phone} /></div>}
            {user && !x.contact_phone && x.phone_masked && (
              <div className="mb-3 font-mono text-lg font-bold tracking-wider">{x.phone_masked}</div>
            )}
            {!user && (x.contact_phone || x.phone_masked) && (
              <div className="mb-3"><DangNhapDeXem /></div>
            )}
            {/* Tin cào: hành động CHÍNH là sang bài gốc để liên hệ người đăng (UX audit: nút "Gửi tin nhắn" to nhất
                khiến khách tưởng nhắn tới người bán, trong khi lead vào Radar). Form Radar là hành động phụ, ghi rõ. */}
            {isCrawl && x.source_url && x.source_url !== "#" ? (
              <a href={x.source_url} target="_blank" rel="noopener nofollow" className="btn btn-primary w-full text-center block mb-3">
                Xem bài gốc & liên hệ trên {x.source_site || "nguồn"} ›
              </a>
            ) : null}
            <TuVanRadar />
            {x.agent_id && (
              <Link
                href={`/tin-nhan?listing=${x.id}&agent=${x.agent_id}`}
                className="btn w-full text-center block mb-3"
              >
                Nhắn tin với người bán
              </Link>
            )}
            {isCrawl ? (
              <details className="mt-1">
                <summary className="text-sm font-semibold cursor-pointer text-brand">Nhờ Radar hỗ trợ tìm/định giá tin tương tự</summary>
                <p className="text-xs text-[var(--ink-soft)] my-2">Để lại SĐT - Radar (không phải người đăng tin này) sẽ liên hệ tư vấn các tin phù hợp trong khu vực.</p>
                <ContactForm listingId={x.id} listingTitle={x.title} viaRadar />
              </details>
            ) : (
              <ContactForm listingId={x.id} listingTitle={x.title} />
            )}
            {x.agent_id && (
              <div className="mt-4 pt-4 border-t border-[var(--line)]">
                <AppointmentForm listingId={x.id} agentId={x.agent_id} />
              </div>
            )}
            {!isCrawl && x.source_url && x.source_url !== "#" ? (
              <a
                href={x.source_url}
                target="_blank"
                rel="noopener nofollow"
                className="block text-center mt-3 text-sm text-brand font-semibold"
              >
                Xem bài gốc trên {x.source_site || "nguồn"} ›
              </a>
            ) : null}
            <div className="mt-3 pt-3 border-t border-[var(--line)] flex justify-between items-start gap-2">
              <span className="text-[0.68rem] text-[var(--ink-faint)]">Mã tin: <code>{x.id.slice(0, 8)}</code></span>
              <ReportButton listingId={x.id} />
            </div>
          </div>

          {/* Độ mới của tin - 3 mốc: đăng trên nguồn / Radar thấy lần đầu / thấy gần nhất */}
          <div className="card rounded-lg p-5 text-sm">
            <h3 className="font-bold mb-2">Độ mới của tin</h3>
            <div className="grid grid-cols-[1fr_auto] gap-y-1.5">
              {x.posted_at ? (<>
                <span className="text-[var(--ink-soft)]">Đăng trên {x.source_site || "nguồn"}</span>
                <span className="font-semibold">{fmtDT(x.posted_at)}</span>
              </>) : null}
              <span className="text-[var(--ink-soft)]">Radar thấy tin</span>
              <span className="font-semibold" title={fmtDT(x.first_seen_at)}>{seen != null ? fresh(seen) : "-"}</span>
              <span className="text-[var(--ink-soft)]">Thấy gần nhất</span>
              <span className={`font-semibold ${isGone ? "text-amber-600" : ""}`} title={fmtDT(x.last_seen_at ?? x.crawled_at)}>
                {lastSeen != null ? fresh(lastSeen) : (x.crawled_at ? fmtDT(x.crawled_at) : "-")}
                {x.crawl_count && x.crawl_count > 1 ? <span className="text-[var(--ink-faint)] font-normal"> · {x.crawl_count} lần</span> : null}
              </span>
              <span className="text-[var(--ink-soft)]">Nguồn</span>
              <span className="font-semibold">
                {x.source === "agent" ? "Tự đăng" : (x.source_sites && x.source_sites.length > 1 ? x.source_sites.join(" + ") : x.source_site || "crawl")}
              </span>
              {x.trust_score ? (<>
                <span className="text-[var(--ink-soft)]" title="Chấm theo mức đầy đủ dữ liệu: ảnh, pháp lý, mô tả, giá & diện tích, dấu hiệu chính chủ - không phải xác minh">Độ đầy đủ tin</span>
                <span className="font-semibold">{x.trust_score}/100</span>
              </>) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: thanh CTA dính đáy - khối liên hệ nằm cuối trang, khách phải cuộn 4-5 màn (UX audit).
          Bù padding-bottom cho body qua div dưới. */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-[var(--line)] bg-[var(--surface)]/95 backdrop-blur px-4 py-2.5 flex items-center gap-3">
        <div className="min-w-0">
          <div className="text-brand font-extrabold leading-tight">{fmtPrice(x.price_vnd, x.deal)}</div>
          <div className="text-[0.68rem] text-[var(--ink-soft)] truncate">{[x.area_m2 ? `${x.area_m2} m²` : null, x.district].filter(Boolean).join(" · ")}</div>
        </div>
        {isCrawl && x.source_url && x.source_url !== "#" ? (
          <a href={x.source_url} target="_blank" rel="noopener nofollow" className="btn btn-primary ml-auto whitespace-nowrap min-h-12 px-5">Xem bài gốc ›</a>
        ) : (
          <a href="#lien-he" className="btn btn-primary ml-auto whitespace-nowrap min-h-12 px-5">Liên hệ</a>
        )}
      </div>
      {/* Tin khác của cùng người đăng (kiểu hồ sơ môi giới batdongsan "đang có N tin") */}
      {posterOthers.length > 0 && (
        <section className="mt-12">
          <h2 className="prata text-xl mb-1">Người đăng này còn {posterCount ?? posterOthers.length} tin khác</h2>
          <p className="text-xs text-[var(--ink-soft)] mb-4">Gom theo tài khoản đăng trên {x.source_site || "nguồn"} - {(posterCount ?? 0) >= 3 ? "nhiều tin cùng lúc thường là môi giới/sàn." : "ít tin, có thể là chính chủ."}</p>
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]">
            {posterOthers.map((r) => <ListingCard key={r.id} x={r} />)}
          </div>
        </section>
      )}

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
      {/* NN/g #6: nhớ tin đã xem (localStorage) + hiện dải "Đã xem gần đây" */}
      <RecentlyViewedTracker item={{ id: x.id, title: x.title, price: fmtPrice(x.price_vnd, x.deal), where: [x.district, x.province].filter(Boolean).join(", "), img: images[0] || null }} />
      <RecentlyViewed excludeId={x.id} />
      {/* chừa chỗ cho thanh CTA dính đáy trên mobile */}
      <div className="lg:hidden h-16" aria-hidden />
    </div>
  );
}
