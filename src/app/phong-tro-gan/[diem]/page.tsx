import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { DIEM_NEO, timDiemNeo, kmGiua, type DiemNeo } from "@/lib/diem-neo";
import { NGUONG, robotsTheoSoTin } from "@/lib/seo-index";
import { LISTING_CARD_COLS, truyVanVoiRetry } from "@/lib/cols";
import { fmtPrice } from "@/lib/format";
import { median } from "@/lib/gemini";
import { slugify } from "@/lib/slug";
import { ldJson, SITE_URL } from "@/lib/ld";
import { cheSoTin } from "@/lib/doc-quyen";
import type { Listing } from "@/lib/types";
import ListingCard from "@/components/ListingCard";
import SanPhongHoCTA from "@/components/SanPhongHoCTA";
import {
  MapPin,
  Compass,
  ChevronRight,
  ShieldCheck,
  DollarSign,
  Sparkles,
  Train,
  Plane,
  Hospital,
  Factory,
  Briefcase,
  HelpCircle,
  SlidersHorizontal,
} from "lucide-react";

export const revalidate = 43200;

export async function generateStaticParams() {
  return DIEM_NEO.map((d) => ({ diem: d.slug }));
}

type DiemNeoSummary = {
  tongTin: number;
  giaTrungVi: string;
  cuLy500m: number;
  cuLy1km: number;
  cuLy2km: number;
  listings: (Listing & { kc: number })[];
};

/**
 * Lấy danh sách phòng trọ trong bán kính quanh điểm neo, có cache 3 giờ.
 * Tách 2 nhịp (đọc 4 cột nhẹ tính thống kê/cự ly -> tải thẻ cho 36 tin gần nhất) để giữ cache < 100KB và tránh timeout lúc build.
 */
const layPhongQuanhDiem = (slug: string) =>
  unstable_cache(
    async (): Promise<DiemNeoSummary> => {
      const d = timDiemNeo(slug);
      if (!d) return { tongTin: 0, giaTrungVi: "-", cuLy500m: 0, cuLy1km: 0, cuLy2km: 0, listings: [] };
      const dLat = d.banKinhKm / 111;
      const dLng = d.banKinhKm / (111 * Math.cos((d.lat * Math.PI) / 180));
      const supabase = createAdminClient();

      const docTrangToaDo = async (tu: number, den: number) =>
        (
          await truyVanVoiRetry(
            () =>
              supabase
                .from("listings")
                .select("id, lat, lng, price_vnd")
                .eq("status", "published")
                .eq("deal", "cho_thue")
                .gte("lat", d.lat - dLat)
                .lte("lat", d.lat + dLat)
                .gte("lng", d.lng - dLng)
                .lte("lng", d.lng + dLng)
                .order("lat", { ascending: true })
                .range(tu, den),
            `${slug}:coords:${tu}`,
          )
        ).data;

      const batch1 = await docTrangToaDo(0, 999);
      const rawRows = batch1.length === 1000 ? [...batch1, ...(await docTrangToaDo(1000, 1999))] : batch1;

      const matched = rawRows
        .map((x) => ({
          id: x.id as string,
          price_vnd: x.price_vnd as number | null,
          kc: kmGiua(d.lat, d.lng, x.lat as number, x.lng as number),
        }))
        .filter((x) => x.kc <= d.banKinhKm)
        .sort((a, b) => a.kc - b.kc);

      const prices = matched.map((x) => x.price_vnd).filter((p): p is number => p != null && p > 0);
      const giaTrungVi = prices.length ? fmtPrice(median(prices), "cho_thue") : "-";
      const cuLy500m = matched.filter((x) => x.kc <= 0.5).length;
      const cuLy1km = matched.filter((x) => x.kc > 0.5 && x.kc <= 1.0).length;
      const cuLy2km = matched.filter((x) => x.kc > 1.0).length;

      const top36 = matched.slice(0, 36);
      const kcById = new Map(top36.map((x) => [x.id, x.kc]));
      const cardsRaw = top36.length
        ? (
            await truyVanVoiRetry(
              () =>
                supabase
                  .from("listings")
                  .select(LISTING_CARD_COLS)
                  .eq("status", "published")
                  .in("id", top36.map((x) => x.id)),
              `${slug}:cards`,
            )
          ).data
        : [];

      const listings = (cardsRaw as unknown as Listing[])
        .map((x) => ({ ...cheSoTin(x), kc: kcById.get(x.id) ?? 0 }))
        .sort((a, b) => a.kc - b.kc);

      return {
        tongTin: matched.length,
        giaTrungVi,
        cuLy500m,
        cuLy1km,
        cuLy2km,
        listings,
      };
    },
    ["diem-neo-ds-v2", slug],
    { revalidate: 21600, tags: ["listings", "diem-neo"] }
  )();

export async function generateMetadata({
  params,
}: {
  params: Promise<{ diem: string }>;
}): Promise<Metadata> {
  const { diem } = await params;
  const d = timDiemNeo(diem);
  if (!d) return {};

  const { tongTin: n, giaTrungVi } = await layPhongQuanhDiem(diem);
  const giaTB = giaTrungVi !== "-" ? giaTrungVi : "giá tốt";

  const title = `Phòng Trọ Gần ${d.ten}: ${n} Phòng Trong ${d.banKinhKm}km Giá Từ ${giaTB} | NhaDat Radar`;
  const description = `Danh sách ${n} phòng trọ, căn hộ mini, studio cho thuê gần ${d.ten} (${d.quanChinh}). Giá trung vị ${giaTB}, bán kính ${d.banKinhKm}km. 5 khoản phí minh bạch, ảnh thật, hẹn xem miễn phí qua Radar.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/phong-tro-gan/${d.slug}`,
    },
    robots: robotsTheoSoTin(n, NGUONG.diemNeo),
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/phong-tro-gan/${d.slug}`,
      type: "website",
    },
  };
}

const iconNhom = (nhom: string) => {
  switch (nhom) {
    case "van-phong":
      return <Briefcase className="w-4 h-4 text-brand" />;
    case "giao-thong":
      return <Plane className="w-4 h-4 text-sky-500" />;
    case "benh-vien":
      return <Hospital className="w-4 h-4 text-rose-500" />;
    case "ga-metro":
      return <Train className="w-4 h-4 text-emerald-500" />;
    case "khu-cong-nghiep":
      return <Factory className="w-4 h-4 text-amber-500" />;
    default:
      return <MapPin className="w-4 h-4 text-brand" />;
  }
};

export default async function DiemNeoPage({
  params,
}: {
  params: Promise<{ diem: string }>;
}) {
  const { diem } = await params;
  const d = timDiemNeo(diem);
  if (!d) notFound();

  const { tongTin, giaTrungVi, cuLy500m, cuLy1km, cuLy2km, listings } = await layPhongQuanhDiem(diem);

  const diemNeoKhac = DIEM_NEO.filter((x) => x.slug !== d.slug);

  // JSON-LD Schemas: Breadcrumb & FAQ
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Trang chủ", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Cho thuê nhà đất", item: `${SITE_URL}/nha-dat-cho-thue` },
      { "@type": "ListItem", position: 3, name: `Phòng trọ gần ${d.ten}`, item: `${SITE_URL}/phong-tro-gan/${d.slug}` },
    ],
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Giá thuê phòng trọ gần ${d.ten} hiện tại là bao nhiêu?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Mức giá thuê trung vị quanh khu vực ${d.ten} hiện khoảng ${giaTrungVi}/tháng. Trong đó phòng cách dưới 500m có ${cuLy500m} phòng, từ 500m đến 1km có ${cuLy1km} phòng phù hợp cho người đi làm và học tập.`,
        },
      },
      {
        "@type": "Question",
        name: `Khu vực quanh ${d.ten} có những ưu điểm gì khi thuê phòng?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: d.moTa,
        },
      },
    ],
  };

  const slugQuan = slugify(d.quanChinh);

  return (
    <main className="min-h-screen bg-[var(--surface-0)] text-[var(--text-1)] pb-16">
      {/* Schemas */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(faqLd) }} />

      {/* Hero Header */}
      <div className="bg-gradient-to-b from-brand/10 via-[var(--surface-1)] to-[var(--surface-0)] border-b border-[var(--border)] pt-8 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-[var(--text-3)] mb-4">
            <Link href="/" className="hover:text-brand transition-colors">Trang chủ</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/nha-dat-cho-thue" className="hover:text-brand transition-colors">Cho thuê nhà đất</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[var(--text-1)] font-medium">Gần {d.ten}</span>
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/15 text-brand text-xs font-bold mb-3">
                {iconNhom(d.nhom)}
                <span>ĐIỂM NEO NỔI BẬT · {d.tenNhom.toUpperCase()}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[var(--text-1)]">
                Phòng Trọ Gần {d.ten} ({d.quanChinh})
              </h1>
              <p className="mt-3 text-sm sm:text-base text-[var(--text-2)] max-w-3xl leading-relaxed">
                {d.moTa}
              </p>
            </div>

            {/* Quick stats box */}
            <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-4 flex sm:flex-col justify-between sm:justify-center gap-2 min-w-[240px] shadow-xs">
              <div className="text-xs text-[var(--text-3)]">Giá thuê trung vị ({d.banKinhKm}km):</div>
              <div className="text-xl sm:text-2xl font-extrabold text-brand flex items-center gap-1">
                <DollarSign className="w-6 h-6 shrink-0" />
                {giaTrungVi}
              </div>
              <div className="text-[11px] text-[var(--text-3)] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Tổng hợp {tongTin.toLocaleString("vi-VN")} phòng thực tế</span>
              </div>
            </div>
          </div>

          {/* Khoảng cách & Lợi thế */}
          <div className="mt-6 pt-5 border-t border-[var(--border)]/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-lg bg-[var(--surface-1)] border border-[var(--border)]">
              <span className="text-[var(--text-3)] block mb-0.5">Dưới 500m (đi bộ):</span>
              <strong className="text-sm font-bold text-brand">{cuLy500m} phòng</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-[var(--surface-1)] border border-[var(--border)]">
              <span className="text-[var(--text-3)] block mb-0.5">Từ 500m - 1km:</span>
              <strong className="text-sm font-bold text-[var(--text-1)]">{cuLy1km} phòng</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-[var(--surface-1)] border border-[var(--border)]">
              <span className="text-[var(--text-3)] block mb-0.5">Từ 1km - {d.banKinhKm}km:</span>
              <strong className="text-sm font-bold text-[var(--text-1)]">{cuLy2km} phòng</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-[var(--surface-1)] border border-[var(--border)]">
              <span className="text-[var(--text-3)] block mb-0.5">Khu vực hành chính:</span>
              <Link href={`/nha-dat-cho-thue/ho-chi-minh/${slugQuan}/phong-tro`} className="text-sm font-bold text-brand hover:underline inline-flex items-center gap-1">
                {d.quanChinh} →
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Lợi thế khi thuê trọ quanh điểm neo */}
        <section className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-5 mb-8">
          <h2 className="text-base font-bold text-[var(--text-1)] mb-3 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand" />
            Lợi thế vị trí khi thuê phòng quanh {d.ten}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-[var(--text-2)]">
            {d.loiThe.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold shrink-0">✓</span>
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Danh sách phòng */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-brand" />
            <h2 className="text-base sm:text-lg font-bold text-[var(--text-1)]">
              Danh sách phòng trọ gần {d.ten} (xếp theo khoảng cách gần nhất)
            </h2>
          </div>
          <span className="text-xs text-[var(--text-3)] font-medium">
            Có <strong className="text-[var(--text-1)]">{tongTin.toLocaleString("vi-VN")}</strong> tin phù hợp
          </span>
        </div>

        {listings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map((item) => (
              <div key={item.id} className="relative group/card">
                <ListingCard x={item} />
                {item.kc != null && (
                  <span className="absolute bottom-3 right-3 z-10 px-2 py-0.5 rounded text-[11px] font-bold bg-slate-900/90 text-white backdrop-blur-xs border border-white/20 shadow-sm">
                    Cách {d.ten}: {item.kc} km
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center rounded-xl bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-2)]">
            Hiện chưa có phòng nào trong bán kính gần. Bạn có thể xem các phòng tại {d.quanChinh}.
          </div>
        )}

        {/* CTA Săn phòng hộ */}
        <div className="mt-12">
          <SanPhongHoCTA
            tieuDe={`Cần tìm gấp phòng trọ gần ${d.ten}?`}
            moTa={`Nhắn mức giá và khu vực mong muốn, trợ lý Radar sẽ đối chiếu rổ hàng phòng trống xác minh và gửi bạn 3 lựa chọn gần ${d.ten} phù hợp nhất trong 15 phút.`}
            tinNhanZalo={`Chào Radar, mình đang cần tìm phòng trọ gần ${d.ten} (${d.quanChinh}), nhờ Radar gửi mình danh sách phòng trống tốt nhất nhé!`}
          />
        </div>

        {/* FAQ */}
        <section className="mt-12 bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-6">
          <h2 className="text-lg font-bold text-[var(--text-1)] mb-4 flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-brand" />
            Câu hỏi thường gặp khi thuê phòng quanh {d.ten}
          </h2>
          <div className="space-y-4">
            {faqLd.mainEntity.map((item, idx) => (
              <div key={idx} className="border-b border-[var(--border)]/60 pb-3 last:border-b-0 last:pb-0">
                <h3 className="font-semibold text-sm text-[var(--text-1)] mb-1">
                  {item.name}
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-2)] leading-relaxed">
                  {item.acceptedAnswer.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Khám phá các điểm neo khác */}
        <section className="mt-12">
          <div className="flex items-center gap-2 mb-4">
            <Compass className="w-4 h-4 text-brand" />
            <h2 className="text-base sm:text-lg font-bold text-[var(--text-1)]">
              Khám phá phòng trọ quanh các điểm neo khác tại TP.HCM
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {diemNeoKhac.map((dn) => (
              <Link
                key={dn.slug}
                href={`/phong-tro-gan/${dn.slug}`}
                className="p-3.5 rounded-xl bg-[var(--surface-1)] border border-[var(--border)] hover:border-brand/40 hover:bg-[var(--surface-2)] transition-colors group flex items-start justify-between"
              >
                <div>
                  <div className="text-xs text-[var(--text-3)] mb-0.5 flex items-center gap-1.5">
                    {iconNhom(dn.nhom)}
                    <span>{dn.tenNhom}</span>
                  </div>
                  <h3 className="font-bold text-sm text-[var(--text-1)] group-hover:text-brand transition-colors">
                    Phòng trọ gần {dn.ten}
                  </h3>
                  <span className="text-xs text-[var(--text-2)] block mt-0.5">
                    {dn.quanChinh} · Bán kính {dn.banKinhKm}km
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--text-3)] group-hover:text-brand transition-transform group-hover:translate-x-0.5 mt-2" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
