// ISR 24 giờ trên CDN Vercel (dự án ít thay đổi, giảm tối đa truy vấn Supabase)
export const revalidate = 86400;
// 26/10: thiếu hàm này thì route [id] là ƒ Dynamic và `revalidate` bị bỏ qua (no-store) - giống trang tin (listings/[id]).
// Trả [] = không dựng sẵn ~2.300 dự án lúc build; dựng lần đầu có người mở rồi cache ISR.
export async function generateStaticParams() {
  return [];
}

import type { Metadata } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { createAnonClient } from "@/lib/supabase/anon";
import { LISTING_THE_COLS } from "@/lib/cols";
import { AMEN } from "@/lib/format";
import { giaDuAn, hangThongSo, mucTrangDuAn, tenChuDauTu } from "@/lib/du-an-hien-thi";
import { cleanImages } from "@/lib/img";
import ListingCard from "@/components/ListingCard";
import Gallery from "@/components/Gallery";
import MucLucTrang from "@/components/MucLucTrang";
import SafeImg from "@/components/SafeImg";
import ProjectContact from "./ProjectContact";
import RichText from "@/components/RichText";
import type { Project, Listing } from "@/lib/types";
import { cheSoTin } from "@/lib/doc-quyen";
import { docToaDoWkb, khoangCachKm } from "@/lib/du-an";
import { DU_AN_DA_GOP } from "@/lib/du-an-da-gop";
import { ldJson, SITE_URL } from "@/lib/ld";
import { NGUONG } from "@/lib/seo-index";
import { catChu } from "@/lib/format";
import { ChevronLeft, Building2, MapPin, ChevronDown, ChevronUp, Check } from "lucide-react";


const ListingMap = dynamic(() => import("@/components/ListingMap"), {
  loading: () => (
    <div className="w-full h-72 rounded-sm bg-[var(--surface-2)] animate-pulse grid place-items-center text-sm text-[var(--ink-faint)]">
      Đang tải bản đồ…
    </div>
  ),
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = createAnonClient();
  const [{ data: proj }, { count: soTinDuAn }] = await Promise.all([
    supabase.from("projects").select("id,name,investor,province,district,address,description,images,status").eq("id", id).maybeSingle(),
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("project_id", id).eq("status", "published"),
  ]);
  if (!proj) {
    return {
      title: "Dự án không tồn tại | NhaDat Radar",
      robots: { index: false, follow: true },
    };
  }
  const p = proj as { id: string; name: string; investor?: string; province?: string; district?: string; address?: string; description?: string; images?: string[]; status?: string };
  // bản trùng đã ẩn (cùng tên + quận với một dự án khác, 17/11) vẫn mở được qua link cũ nhưng không để Google lập chỉ mục
  const laMong = p.status !== "published" || ((p.description || "").trim().length < 200 && (soTinDuAn ?? 0) < NGUONG.duAn);
  const where = [p.district, p.province].filter(Boolean).join(", ");
  // 30/10: giữ đuôi " | NhaDat Radar", cắt phần tên dự án ở ranh giới từ để tổng <= 60 ký tự (Google cắt ~60).
  const duoi = " | NhaDat Radar";
  const goc = `Dự án ${p.name}${p.district ? ` - ${p.district}` : ""}`;
  const cho = 60 - duoi.length;
  const title = `${Array.from(goc).length <= cho ? goc : `${catChu(goc, cho - 1).replace(/\s+\S*$/, "").trim()}…`}${duoi}`;
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
    ...(laMong ? { robots: { index: false, follow: true } } : {}),
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
  if (DU_AN_DA_GOP[id]) permanentRedirect(`/projects/${DU_AN_DA_GOP[id]}`);   // bản trùng đã xoá -> dự án giữ lại (lib/du-an-da-gop)
  const supabase = createAnonClient();
  // 2/11 (audit D3): chỉ cột trang dùng - select("*") kéo cả embedding vector(768) ~15KB/dự án
  const { data: proj } = await supabase.from("projects")
    .select("id,name,investor,description,province,district,address,amenities,images,price_min,price_max,price_per_m2_text,handover,specs,geo")
    .eq("id", id).single();
  if (!proj) notFound();
  const p = proj as unknown as Project;

  const { data: ls } = await supabase
    .from("listings")
    .select(LISTING_THE_COLS)
    .eq("project_id", id)
    .eq("status", "published")
    .order("first_seen_at", { ascending: false })
    .limit(24);
  let listings = ((ls ?? []) as Listing[]).map(cheSoTin);

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
      .slice(0, 8).map(cheSoTin);
    related = quanhKm = listings.length > 0;
  }
  if (!listings.length && (p.district || p.province)) {
    const { data: near } = await supabase
      .from("listings").select(LISTING_THE_COLS).eq("status", "published")
      .ilike(p.district ? "district" : "province", `%${p.district || p.province}%`)
      .not("images", "eq", "{}")
      .order("ai_score", { ascending: false, nullsFirst: false }).limit(8);
    listings = ((near ?? []) as Listing[]).map(cheSoTin);
    related = listings.length > 0;
  }


  // DỰ ÁN KHÁC CỦA CÙNG CHỦ ĐẦU TƯ (kiểu Mogi). Chỉ 4 dòng, cột nhẹ (egress: trang ISR 24 giờ nên mỗi dự án đọc ~1 lần/ngày)
  const cdt = tenChuDauTu(p.investor);
  const lamSach = (x: string) => x.replace(/[%_*,()]/g, " ").replace(/\s+/g, " ").trim();
  const { data: cungCdtRaw } = cdt.length >= 6
    ? await supabase.from("projects").select("id,name,province,district,images,price_min,price_max")
        .eq("status", "published").neq("id", id).not("images", "eq", "{}")
        .ilike("investor", `%${lamSach(cdt)}%`)
        .order("priority", { ascending: false }).order("name").limit(4)
    : { data: [] };
  const cungCdt = (cungCdtRaw ?? []) as unknown as DuAnThe[];

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

  // ---- Bố cục kiểu Mogi (17/11): tổng quan (giá + thông số + nút) -> thanh mục dính -> các mục; mục nào KHÔNG có dữ liệu thì ẩn ----
  const rows = hangThongSo(p.specs, { handover: p.handover, coGia: !!p.price_min });
  const gia = p.price_min ? giaDuAn(p.price_min, p.price_max).replace(/^Từ /, "") : giaDuAn(null, p.price_max);
  const coMoTa = !!(p.description || "").trim();
  const ban = related ? [] : listings.filter((x) => x.deal === "ban");
  const thue = related ? [] : listings.filter((x) => x.deal === "cho_thue");
  // address của nguồn thường ĐÃ chứa quận/tỉnh -> chỉ nối thêm phần chưa có, không thì ra
  // "Lê Cơ, Phường An Lạc, Quận Bình Tân, TPHCM, Quận Bình Tân, Hồ Chí Minh" (17/8)
  const co = (s?: string | null) => !!s && (p.address || "").toLowerCase().includes(s.toLowerCase());
  const diaChi = [p.address, co(p.district) ? null : p.district, co(p.province) ? null : p.province].filter(Boolean).join(", ") || "-";
  const muc = mucTrangDuAn({
    moTa: coMoTa, tienIch: !!p.amenities?.length, viTri: !!td, ban: ban.length > 0, thue: thue.length > 0,
    quanh: related && listings.length > 0, chuDauTu: !!cdt,
  });
  const nutQuanh = td && (
    <>
      <Link href={quanh("cho_thue")!} className="btn btn-primary min-h-11 font-bold"><MapPin className="w-4 h-4" /> Tin cho thuê quanh dự án</Link>
      <Link href={quanh("ban")!} className="btn btn-primary min-h-11 font-bold"><MapPin className="w-4 h-4" /> Tin bán quanh dự án</Link>
    </>
  );

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

      <div className="grid lg:grid-cols-[1fr_340px] gap-6 mt-4">
        <div className="min-w-0">
          {/* ảnh nằm TRONG cột trái (không tràn cả bề ngang): hero 16:9 vừa cột, khung tư vấn bên phải ngang hàng với ảnh như Mogi */}
          <div className="mb-4">
            {imgs.length ? (
              <Gallery images={imgs} title={p.name} anhThap />
            ) : (
              <div className="rounded-lg overflow-hidden aspect-[21/9] max-h-[420px] grid place-items-center text-white bg-gradient-to-br from-brand to-brand-2">
                <Building2 className="w-16 h-16 text-white/50" />
              </div>
            )}
          </div>
          <h1 className="prata text-3xl">{p.name}</h1>
          {cdt ? <div className="text-brand font-semibold">{cdt}</div> : null}
          <div className="text-sm text-[var(--ink-soft)] mt-1 flex items-start gap-1.5">
            <MapPin className="w-4 h-4 text-[var(--ink-faint)] shrink-0 mt-0.5" />
            <span>{diaChi}</span>
          </div>

          {/* TỔNG QUAN (Mogi: giá + bảng thông số + nút ngay dưới tên dự án, trước phần mô tả dài) */}
          <section id="tong-quan" className="card rounded-lg p-5 mt-4 scroll-mt-28">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
              <div>
                <div className="text-xs text-[var(--ink-soft)] uppercase">{p.price_min ? "Mức giá từ" : "Mức giá"}</div>
                <div className="prata text-2xl text-brand">{gia}</div>
              </div>
              {p.price_per_m2_text ? <div className="text-sm text-[var(--ink-soft)]">{p.price_per_m2_text}</div> : null}
            </div>
            {!p.price_min && !p.price_max ? <div className="text-xs text-[var(--ink-soft)] mt-1">Liên hệ tư vấn để nhận bảng giá và chính sách bán hàng.</div> : null}
            {rows.length > 0 && (
              <dl className="mt-4 pt-1 border-t border-[var(--line)] grid gap-x-8 sm:grid-cols-2">
                {rows.map(([k, v]) => (
                  <div key={k} className="flex items-baseline gap-3 py-2 border-b border-[var(--line)] text-sm">
                    <dt className="text-[var(--ink-soft)] shrink-0">{k}</dt>
                    <dd className="ml-auto font-semibold text-right">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
            <div className="flex flex-wrap gap-2 mt-4">{nutQuanh}</div>
            <div className="lg:hidden"><ProjectContact projectId={p.id} projectName={p.name} /></div>
          </section>

          <MucLucTrang muc={muc} nhan="Đi tới mục của dự án" />

          {coMoTa && (
            <section id="gioi-thieu" className="card rounded-lg p-5 mt-4 scroll-mt-28">
              <TieuDeMuc ten="Giới thiệu" du={p.name} />
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
                      <summary className="cursor-pointer list-none text-sm font-semibold text-brand inline-flex items-center gap-1 min-h-11">
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
            </section>
          )}

          {p.amenities?.length ? (
            <section id="tien-ich" className="card rounded-lg p-5 mt-4 scroll-mt-28">
              <TieuDeMuc ten="Tiện ích nội khu" />
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {p.amenities.map((a) => (
                  <li key={a} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-brand shrink-0 mt-0.5" aria-hidden />
                    <span>{AMEN[a] || a}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {td && (
            <section id="vi-tri" className="card rounded-lg p-5 mt-4 scroll-mt-28">
              <TieuDeMuc ten="Vị trí dự án" />
              <div className="text-sm text-[var(--ink-soft)] mb-3 flex items-start gap-1.5">
                <MapPin className="w-4 h-4 text-[var(--ink-faint)] shrink-0 mt-0.5" />
                <span>{diaChi}</span>
              </div>
              <ListingMap lat={td.lat} lng={td.lng} title={p.name} deal="ban" />
              {/* Tiện ích quanh đây: mở Google Maps tìm quanh toạ độ dự án - không cần API trả phí */}
              <div className="flex flex-wrap gap-2 mt-3 text-xs">
                <span className="text-[var(--ink-soft)] self-center">Quanh đây:</span>
                {[["Trường học", "trường học"], ["Bệnh viện", "bệnh viện"], ["Chợ / siêu thị", "chợ siêu thị"], ["Bến xe buýt", "trạm xe buýt"]].map(([nhan, q]) => (
                  <a key={q} href={`https://www.google.com/maps/search/${encodeURIComponent(q)}/@${td.lat},${td.lng},15z`} target="_blank" rel="noopener noreferrer" className="btn !py-1.5 !px-2.5 text-xs">{nhan}</a>
                ))}
                <a href={`https://www.google.com/maps/dir/?api=1&destination=${td.lat},${td.lng}`} target="_blank" rel="noopener noreferrer" className="btn !py-1.5 !px-2.5 text-xs">Chỉ đường</a>
              </div>
            </section>
          )}

          {/* Tách BÁN / CHO THUÊ (21/8): người tìm mua và người tìm thuê là hai nhu cầu khác hẳn nhau,
              trộn chung một lưới thì giá 5 tỷ đứng cạnh 12 triệu/tháng rất nhiễu. Không có tin thì ẨN mục (17/11). */}
          {ban.length > 0 && (
            <section id="dang-ban" className="mt-6 scroll-mt-28">
              <TieuDeMuc ten={`Đang bán trong dự án (${ban.length})`} />
              <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
                {ban.map((x) => <ListingCard key={x.id} x={x} />)}
              </div>
            </section>
          )}
          {thue.length > 0 && (
            <section id="cho-thue" className="mt-6 scroll-mt-28">
              <TieuDeMuc ten={`Đang cho thuê trong dự án (${thue.length})`} />
              <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
                {thue.map((x) => <ListingCard key={x.id} x={x} />)}
              </div>
            </section>
          )}
          {related && listings.length > 0 && (
            <section id="tin-quanh" className="mt-6 scroll-mt-28">
              <TieuDeMuc ten={quanhKm ? `Tin đăng trong bán kính 2 km quanh ${p.name}` : `Bất động sản tại ${p.district || p.province}`} />
              <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
                {listings.map((x) => <ListingCard key={x.id} x={x} />)}
              </div>
            </section>
          )}

          {cdt && (
            <section id="chu-dau-tu" className="card rounded-lg p-5 mt-6 scroll-mt-28">
              <TieuDeMuc ten="Chủ đầu tư" />
              <div className="flex items-center gap-3">
                <span className="grid place-items-center w-11 h-11 rounded bg-brand/10 text-brand shrink-0"><Building2 className="w-5 h-5" aria-hidden /></span>
                <div className="font-semibold">{cdt}</div>
              </div>
              {cungCdt.length > 0 && (
                <>
                  <h3 className="font-semibold text-sm text-[var(--ink-soft)] mt-5 mb-3">Dự án khác của chủ đầu tư</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {cungCdt.map((d) => <TheDuAnNho key={d.id} d={d} />)}
                  </div>
                </>
              )}
            </section>
          )}
        </div>

        {/* Cột phải (máy tính): khung tư vấn dính khi cuộn; điện thoại dùng nút trong thẻ tổng quan */}
        <aside className="hidden lg:block">
          <div className="card rounded-lg p-5 sticky top-20">
            <div className="font-bold mb-2">Nhận tư vấn về dự án</div>
            <Row k="Chủ đầu tư" v={cdt || "-"} />
            <Row k="Khu vực" v={[p.district, p.province].filter(Boolean).join(", ") || "-"} />
            <Row k={related ? "Tin gợi ý cùng khu vực" : "Tin đang đăng"} v={String(listings.length)} />
            <ProjectContact projectId={p.id} projectName={p.name} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function TieuDeMuc({ ten, du }: { ten: string; du?: string }) {
  return (
    <h2 className="font-bold text-lg mb-3">
      {ten}
      {du ? <span className="ml-2 text-sm font-normal text-[var(--ink-soft)]">{du}</span> : null}
    </h2>
  );
}

type DuAnThe = { id: string; name: string; province: string | null; district: string | null; images: string[] | null; price_min: number | null; price_max: number | null };

function TheDuAnNho({ d }: { d: DuAnThe }) {
  return (
    <Link href={`/projects/${d.id}`} className="group card rounded-lg overflow-hidden flex flex-col hover:border-brand transition-colors">
      <div className="aspect-[16/10] bg-[var(--surface-2)] overflow-hidden">
        {d.images?.[0] ? <SafeImg the src={d.images[0]} alt={d.name} className="w-full h-full object-cover" /> : null}
      </div>
      <div className="p-3 flex flex-col gap-0.5">
        <div className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-brand transition-colors">{d.name}</div>
        <div className="text-xs text-[var(--ink-soft)] line-clamp-1">{[d.district, d.province].filter(Boolean).join(", ")}</div>
        <div className="text-brand font-bold text-sm mt-1">{giaDuAn(d.price_min, d.price_max)}</div>
      </div>
    </Link>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 py-2 border-b border-[var(--line)] text-sm">
      <span className="text-[var(--ink-soft)] shrink-0">{k}</span>
      <span className="font-semibold text-right">{v}</span>
    </div>
  );
}
