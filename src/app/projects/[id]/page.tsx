// 1/10: ISR 10 phút, client ẩn danh (dữ liệu công khai) - trước đây mỗi lượt xem là 2-3 truy vấn
export const revalidate = 600;
// 26/10: thiếu hàm này thì route [id] là ƒ Dynamic và `revalidate` bị bỏ qua (no-store) - giống trang tin (listings/[id]).
// Trả [] = không dựng sẵn ~2.300 dự án lúc build; dựng lần đầu có người mở rồi cache ISR.
export async function generateStaticParams() {
  return [];
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAnonClient } from "@/lib/supabase/anon";
import { LISTING_COLS, LISTING_THE_COLS } from "@/lib/cols";
import { fmtPrice, AMEN } from "@/lib/format";
import { cleanImages } from "@/lib/img";
import ListingCard from "@/components/ListingCard";
import Gallery from "@/components/Gallery";
import ProjectContact from "./ProjectContact";
import RichText from "@/components/RichText";
import type { Project, Listing } from "@/lib/types";
import { cheTinDocQuyen } from "@/lib/doc-quyen";
import { docToaDoWkb, khoangCachKm } from "@/lib/du-an";
import { ldJson, SITE_URL } from "@/lib/ld";
import { catChu } from "@/lib/format";
import { ChevronLeft, Building2, MapPin, ChevronDown, ChevronUp } from "lucide-react";


export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = createAnonClient();
  const { data: proj } = await supabase.from("projects").select("id,name,investor,province,district,address,description,images").eq("id", id).maybeSingle();
  if (!proj) {
    return {
      title: "Dự án không tồn tại | NhaDat Radar",
      robots: { index: false, follow: true },
    };
  }
  const p = proj as { id: string; name: string; investor?: string; province?: string; district?: string; address?: string; description?: string; images?: string[] };
  const where = [p.district, p.province].filter(Boolean).join(", ");
  const title = `Dự án ${p.name}${where ? " - " + where : ""}: Bảng giá & Căn hộ bán, cho thuê | NhaDat Radar`;
  const desc = p.description
    ? `Thông tin dự án ${p.name} tại ${p.address || where}. ${catChu(p.description.replace(/\s+/g, " "), 140)}`
    : `Dự án ${p.name} tại ${where}. Xem thông tin chủ đầu tư ${p.investor || "uy tín"}, vị trí, bảng giá và căn hộ bán hoặc cho thuê trên NhaDat Radar.`;
  const imgs = cleanImages(p.images || []);
  const ogImg = imgs[0] || `${SITE_URL}/og-default.png`;
  const url = `${SITE_URL}/projects/${p.id}`;

  return {
    title,
    description: desc,
    alternates: { canonical: `/projects/${p.id}` },
    openGraph: {
      type: "website",
      title,
      description: desc,
      url,
      siteName: "NhaDat Radar",
      locale: "vi_VN",
      images: [{ url: ogImg, width: 1200, height: 630, alt: p.name }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: desc,
      images: [ogImg],
    },
  };
}

export default async function ProjectDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createAnonClient();
  const { data: proj } = await supabase.from("projects").select("*").eq("id", id).single();
  if (!proj) notFound();
  const p = proj as Project;

  const { data: ls } = await supabase
    .from("listings")
    .select(LISTING_THE_COLS)
    .eq("project_id", id)
    .eq("status", "published")
    .order("first_seen_at", { ascending: false })
    .limit(24);
  let listings = ((ls ?? []) as Listing[]).map(cheTinDocQuyen);

  // 26/10: toạ độ dự án (geo EWKB) -> gợi ý tin trong bán kính 2 km + nút "tìm quanh dự án" sang /search
  const td = docToaDoWkb((proj as { geo?: unknown }).geo);
  const quanh = (deal: "cho_thue" | "ban") => td
    ? `/search?${new URLSearchParams({ deal, gan: `${td.lat.toFixed(6)},${td.lng.toFixed(6)}`, bk: "2", gan_ten: p.name })}`
    : null;

  // Chưa có tin gắn trực tiếp dự án -> hiện tin QUANH dự án (2 km, gần trước); không có toạ độ thì cùng quận/tỉnh
  let related = false, quanhKm = false;
  if (!listings.length && td) {
    const dLat = 2 / 111.32, dLng = 2 / (111.32 * Math.cos((td.lat * Math.PI) / 180));
    const { data: near } = await supabase
      .from("listings").select(LISTING_THE_COLS).eq("status", "published").not("images", "eq", "{}")
      .gte("lat", td.lat - dLat).lte("lat", td.lat + dLat).gte("lng", td.lng - dLng).lte("lng", td.lng + dLng)
      .limit(120);
    listings = ((near ?? []) as Listing[])
      .filter((x) => x.lat != null && x.lng != null && khoangCachKm(td, { lat: x.lat!, lng: x.lng! }) <= 2)
      .sort((a, b) => khoangCachKm(td, { lat: a.lat!, lng: a.lng! }) - khoangCachKm(td, { lat: b.lat!, lng: b.lng! }))
      .slice(0, 8).map(cheTinDocQuyen);
    related = quanhKm = listings.length > 0;
  }
  if (!listings.length && (p.district || p.province)) {
    const { data: near } = await supabase
      .from("listings").select(LISTING_THE_COLS).eq("status", "published")
      .ilike(p.district ? "district" : "province", `%${p.district || p.province}%`)
      .not("images", "eq", "{}")
      .order("ai_score", { ascending: false, nullsFirst: false }).limit(8);
    listings = ((near ?? []) as Listing[]).map(cheTinDocQuyen);
    related = listings.length > 0;
  }


  const imgs = cleanImages(p.images || []);
  const ldProject = [
    {
      "@context": "https://schema.org",
      "@type": "ApartmentComplex",
      name: p.name,
      url: `${SITE_URL}/projects/${p.id}`,
      ...(p.description ? { description: catChu(p.description, 500) } : {}),
      ...(imgs.length ? { image: imgs.slice(0, 5) } : {}),
      ...(p.address || p.district || p.province ? {
        address: {
          "@type": "PostalAddress",
          addressCountry: "VN",
          ...(p.province ? { addressRegion: p.province } : {}),
          ...(p.district ? { addressLocality: p.district } : {}),
          ...(p.address ? { streetAddress: p.address } : {}),
        },
      } : {}),
      ...(td ? { geo: { "@type": "GeoCoordinates", latitude: td.lat, longitude: td.lng } } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Trang chủ", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: "Dự án BĐS", item: `${SITE_URL}/projects` },
        ...(p.province ? [{ "@type": "ListItem", position: 3, name: p.province, item: `${SITE_URL}/projects?province=${encodeURIComponent(p.province)}` }] : []),
        { "@type": "ListItem", position: p.province ? 4 : 3, name: p.name, item: `${SITE_URL}/projects/${p.id}` },
      ],
    },
  ];

  return (
    <div>
      {ldProject.map((o, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(o) }} />)}
      <nav className="text-xs text-[var(--ink-soft)] mb-3 flex flex-wrap items-center gap-1">
        <Link href="/" className="hover:text-brand">Trang chủ</Link><span>/</span>
        <Link href="/projects" className="hover:text-brand">Dự án</Link>
        {p.province ? <><span>/</span><Link href={`/projects?province=${encodeURIComponent(p.province)}`} className="hover:text-brand">{p.province}</Link></> : null}
        {p.district ? <><span>/</span><span className="text-[var(--ink)]">{p.district}</span></> : null}
      </nav>
      <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm text-[var(--ink-soft)] hover:text-brand font-semibold transition">
        <ChevronLeft className="w-4 h-4" />
        <span>Về danh sách dự án</span>
      </Link>

      <div className="my-4">
        {(() => {
          const imgs = cleanImages(p.images || []);
          return imgs.length ? (
            <Gallery images={imgs} title={p.name} />
          ) : (
            <div className="rounded-lg overflow-hidden aspect-[21/9] max-h-[420px] grid place-items-center text-white bg-gradient-to-br from-brand to-brand-2">
              <Building2 className="w-16 h-16 text-white/50" />
            </div>
          );
        })()}
      </div>

      <div className="grid lg:grid-cols-[1fr_340px] gap-6">
        <div>
          <h1 className="prata text-3xl">{p.name}</h1>
          <div className="text-brand font-semibold">{p.investor}</div>
          {/* address của nguồn thường ĐÃ chứa quận/tỉnh -> chỉ nối thêm phần chưa có, không thì ra
              "Lê Cơ, Phường An Lạc, Quận Bình Tân, TPHCM, Quận Bình Tân, Hồ Chí Minh" (17/8) */}
          <div className="text-sm text-[var(--ink-soft)] mt-1 flex items-start gap-1.5">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>{(() => {
              const co = (s?: string | null) => !!s && (p.address || "").toLowerCase().includes(s.toLowerCase());
              const phan = [p.address, co(p.district) ? null : p.district, co(p.province) ? null : p.province];
              return phan.filter(Boolean).join(", ") || "-";
            })()}</span>
          </div>
          {td && (
            <div className="flex flex-wrap gap-2 mt-4">
              <Link href={quanh("cho_thue")!} className="btn btn-primary min-h-11 font-bold"><MapPin className="w-4 h-4" /> Tìm phòng trọ quanh dự án</Link>
              <Link href={quanh("ban")!} className="btn min-h-11 font-bold">Nhà đất bán quanh đây</Link>
            </div>
          )}

          {/* Bảng thông số (migration 013): tổng DT, DT xây dựng, DT căn từ-đến, ngày khởi công/hoàn
              thành, pháp lý - thông tin người mua tìm đầu tiên, phải nằm TRÊN phần mô tả dài. */}
          {(() => {
            const specs = (p.specs ?? {}) as Record<string, string>;
            const rows = Object.entries(specs).filter(([, v]) => v);
            if (p.handover) rows.push(["Bàn giao", p.handover]);
            if (!rows.length) return null;
            return (
              <dl className="card rounded-lg p-5 mt-5 grid gap-x-6 gap-y-3 sm:grid-cols-2">
                {rows.map(([k, v]) => (
                  <div key={k} className="flex items-baseline gap-2 border-b border-[var(--line)] pb-2 last:border-0">
                    <dt className="text-xs text-[var(--ink-soft)] shrink-0">{k}</dt>
                    <dd className="ml-auto text-sm font-semibold text-right">{v}</dd>
                  </div>
                ))}
              </dl>
            );
          })()}

          {/* Không có mô tả thì ẨN hẳn khối, đừng hiện cái thẻ trống ghi "(Chưa có mô tả)" -
              266 dự án đã bị mogi gỡ trang chi tiết nên không bao giờ có mô tả (17/8) */}
          {(p.description || "").trim() && (
          <div className="card rounded-lg p-5 mt-4">
            <h2 className="font-bold mb-3">Giới thiệu dự án</h2>
            {/* Mô tả dài -> gấp lại, mở bằng <details> (không cần JS, hoạt động cả khi tắt script) */}
            {(() => {
              const full = p.description || "";
              if (full.length <= 1200) return <RichText text={full} />;
              // Cắt tại ĐẦU DÒNG gần 900 ký tự nhất - cắt giữa chừng sẽ vỡ "## tiêu đề" / "- gạch đầu dòng".
              const cut = full.lastIndexOf("\n", 900);
              const dau = full.slice(0, cut > 300 ? cut : 900);
              const con = full.slice(dau.length);   // phần CÒN LẠI, không lặp lại phần đã hiện
              return (
                <>
                  <RichText text={dau} />
                  <details className="group mt-2">
                    {/* chỉ chữ "Xem đầy đủ" nằm trong summary - để cả đoạn văn vào đây thì bôi đen
                        chọn chữ cũng vô tình đóng/mở, và nội dung sẽ hiện lặp hai lần khi mở */}
                    <summary className="cursor-pointer list-none text-sm font-semibold text-brand inline-flex items-center gap-1">
                      <span className="group-open:hidden inline-flex items-center gap-1">Xem đầy đủ <ChevronDown className="w-4 h-4" /></span>
                      <span className="hidden group-open:inline-flex items-center gap-1">Thu gọn <ChevronUp className="w-4 h-4" /></span>
                    </summary>
                    <div className="mt-3">
                      <RichText text={con} />
                    </div>
                  </details>
                </>
              );
            })()}
          </div>
          )}

          {p.amenities?.length ? (
            <div className="card rounded-lg p-5 mt-4">
              <h3 className="font-bold mb-3">Tiện ích nội khu</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                {p.amenities.map((a) => (
                  <span key={a} className="px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--bg)]">
                    {AMEN[a] || a}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {/* Tách BÁN / CHO THUÊ (21/8): người tìm mua và người tìm thuê là hai nhu cầu khác
              hẳn nhau, trộn chung một lưới thì giá 5 tỷ đứng cạnh 12 triệu/tháng rất nhiễu */}
          {(() => {
            if (!listings.length) return (
              <>
                <h3 className="font-bold mt-6 mb-3">Bất động sản trong dự án</h3>
                <div className="card rounded-lg p-8 text-center text-[var(--ink-soft)]">
                  Chưa có bất động sản nào trong dự án này.
                </div>
              </>
            );
            if (related) return (
              <>
                <h3 className="font-bold mt-6 mb-3">{quanhKm ? `Tin đăng trong bán kính 2 km quanh ${p.name}` : `Bất động sản tại ${p.district || p.province}`}</h3>
                <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
                  {listings.map((x) => <ListingCard key={x.id} x={x} />)}
                </div>
              </>
            );
            const ban = listings.filter((x) => x.deal === "ban");
            const thue = listings.filter((x) => x.deal === "cho_thue");
            return (
              <>
                {ban.length > 0 && (
                  <>
                    <h3 className="font-bold mt-6 mb-3">Đang bán trong dự án ({ban.length})</h3>
                    <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
                      {ban.map((x) => <ListingCard key={x.id} x={x} />)}
                    </div>
                  </>
                )}
                {thue.length > 0 && (
                  <>
                    <h3 className="font-bold mt-6 mb-3">Đang cho thuê trong dự án ({thue.length})</h3>
                    <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
                      {thue.map((x) => <ListingCard key={x.id} x={x} />)}
                    </div>
                  </>
                )}
              </>
            );
          })()}
        </div>

        <div>
          <div className="card rounded-lg p-5 sticky top-20">
            {/* Không có giá nào -> "Giá thoả thuận" (17/8: trước hiện "Thoả thuận - Thoả thuận") */}
            <div className="text-xs text-[var(--ink-soft)] uppercase">{p.price_min ? "Mức giá từ" : "Mức giá"}</div>
            <div className="prata text-2xl text-brand">
              {p.price_min
                ? fmtPrice(p.price_min, "ban") + (p.price_max ? " - " + fmtPrice(p.price_max, "ban") : "")
                : "Giá thoả thuận"}
            </div>
            {p.price_per_m2_text ? (
              <div className="text-xs text-[var(--ink-soft)] mb-4">{p.price_per_m2_text}</div>
            ) : <div className="mb-4" />}
            <Row k="Chủ đầu tư" v={p.investor || "-"} />
            <Row k="Khu vực" v={[p.district, p.province].filter(Boolean).join(", ") || "-"} />
            <Row k={related ? "Tin gợi ý cùng khu vực" : "Số tin đang bán"} v={String(listings.length)} />
            <ProjectContact projectId={p.id} projectName={p.name} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-[var(--line)] text-sm">
      <span className="text-[var(--ink-soft)]">{k}</span>
      <span className="font-semibold text-right">{v}</span>
    </div>
  );
}
