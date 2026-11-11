import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DANH_SACH_DAI_HOC, getDaiHocBySlug } from "@/lib/dai-hoc";
import { createAdminClient } from "@/lib/supabase/admin";
import { quanDB } from "@/lib/chuyen-de";
import { cheSoTin } from "@/lib/doc-quyen";
import { LISTING_CARD_COLS, truyVanVoiRetry } from "@/lib/cols";
import { slugify } from "@/lib/slug";
import type { Listing } from "@/lib/types";
import ListingCard from "@/components/ListingCard";
import SanPhongHoCTA from "@/components/SanPhongHoCTA";
import { ldJson, SITE_URL } from "@/lib/ld";
import {
  GraduationCap,
  MapPin,
  DollarSign,
  ChevronRight,
  School,
  HelpCircle,
  Building,
  CheckCircle2,
  ShieldCheck,
  Compass,
} from "lucide-react";

export const revalidate = 43200;

export async function generateStaticParams() {
  return DANH_SACH_DAI_HOC.map((u) => ({ slug: u.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const u = getDaiHocBySlug(slug);
  if (!u) return {};

  const title = `Phòng Trọ Gần ĐH ${u.tenVietTat} (${u.ten}) Giá Rẻ, Mới Nhất 2026`;
  const description = `Danh sách phòng trọ, căn hộ mini, studio cho thuê gần trường ${u.ten}. Mức giá trung bình ${u.mucGiaTB}. Các khu vực thuê tốt nhất: ${u.khuVucThueTot.join(", ")}.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/phong-tro-gan-truong-dai-hoc/${slug}`,
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/phong-tro-gan-truong-dai-hoc/${slug}`,
      type: "website",
    },
  };
}

export default async function PhongTroDaiHocDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const u = getDaiHocBySlug(slug);

  if (!u) {
    notFound();
  }

  // Truy vấn tin đăng phòng trọ / căn hộ cho thuê thực tế gần trường
  const supabase = createAdminClient();
  const { data: rawListings, count } = await truyVanVoiRetry(
    () =>
      supabase
        .from("listings")
        .select(LISTING_CARD_COLS, { count: "exact" })
        .eq("status", "published")
        .eq("deal", "cho_thue")
        .eq("province", "Hồ Chí Minh")
        // 2/11 (audit 🔴7): DB lưu "Quận Bình Thạnh", "TP. Thủ Đức" - tên trần trong dai-hoc.ts ra 0 tin
        .in("district", u.quan.map(quanDB))
        .order("first_seen_at", { ascending: false, nullsFirst: false })
        .limit(30),
    `dai-hoc:${u.slug}`,
  );

  // che SĐT trong tiêu đề/mô tả như mọi trang công khai; tongTin = số tin thật (không phải 30 thẻ đang hiện)
  const listings = ((rawListings || []) as unknown as Listing[]).map(cheSoTin);
  const tongTin = count ?? listings.length;

  // Liên kết tĩnh bộ lọc cấp quận cho quận chính của trường (/nha-dat-cho-thue/ho-chi-minh/[district]/phong-tro/[bo-loc])
  const quanChinh = u.quan[0] ?? "";
  const boLocChips = quanChinh
    ? [
        { slug: "duoi-3-trieu", nhan: `Dưới 3 triệu (${quanChinh})` },
        { slug: "duoi-4-trieu", nhan: `Dưới 4 triệu (${quanChinh})` },
        { slug: "gac-lung", nhan: `Có gác lửng (${quanChinh})` },
        { slug: "studio", nhan: `Studio (${quanChinh})` },
        { slug: "full-noi-that", nhan: `Full nội thất (${quanChinh})` },
      ].map((b) => ({
        href: `/nha-dat-cho-thue/ho-chi-minh/${slugify(quanDB(quanChinh))}/phong-tro/${b.slug}`,
        nhan: b.nhan,
      }))
    : [
        { href: "/phong-tro-duoi-3-trieu", nhan: "Dưới 3 triệu" },
        { href: "/phong-tro-co-gac-lung", nhan: "Có gác lửng" },
        { href: "/can-ho-mini-full-noi-that", nhan: "CHDV Studio" },
      ];

  // Trường lân cận cùng quận hoặc khu vực
  const truongLanCan = DANH_SACH_DAI_HOC.filter(
    (item) => item.slug !== u.slug && item.quan.some((q) => u.quan.includes(q))
  ).slice(0, 4);

  // JSON-LD Schemas: Breadcrumb & FAQPage
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Trang chủ",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Phòng trọ gần trường đại học",
        item: `${SITE_URL}/phong-tro-gan-truong-dai-hoc`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: u.tenVietTat,
        item: `${SITE_URL}/phong-tro-gan-truong-dai-hoc/${u.slug}`,
      },
    ],
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: u.faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  return (
    <main className="min-h-screen bg-[var(--surface-0)] text-[var(--text-1)] pb-16">
      {/* Schemas */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldJson(breadcrumbLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: ldJson(faqLd) }}
      />

      {/* Hero Header */}
      <div className="bg-gradient-to-b from-brand/10 via-[var(--surface-1)] to-[var(--surface-0)] border-b border-[var(--border)] pt-8 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Breadcrumb pills */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-[var(--text-3)] mb-4">
            <Link href="/" className="hover:text-brand transition-colors">Trang chủ</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <Link href="/phong-tro-gan-truong-dai-hoc" className="hover:text-brand transition-colors">Đại học</Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="text-[var(--text-1)] font-medium">{u.tenVietTat}</span>
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/15 text-brand text-xs font-bold mb-3">
                <School className="w-4 h-4" />
                KHU VỰC {u.quan.join(" & ").toUpperCase()}
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[var(--text-1)]">
                Phòng Trọ Gần ĐH {u.tenVietTat} ({u.ten})
              </h1>
              <p className="mt-2.5 text-sm sm:text-base text-[var(--text-2)] flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-brand shrink-0" />
                <span>{u.diaChi}</span>
              </p>
            </div>

            {/* Quick stats box */}
            <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-4 flex sm:flex-col justify-between sm:justify-center gap-2 min-w-[220px] shadow-xs">
              <div className="text-xs text-[var(--text-3)]">Mức giá phổ biến:</div>
              <div className="text-lg sm:text-xl font-extrabold text-brand flex items-center gap-1">
                <DollarSign className="w-5 h-5 shrink-0" />
                {u.mucGiaTB}
              </div>
              <div className="text-[11px] text-[var(--text-3)] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Đã kiểm duyệt địa chỉ
              </div>
            </div>
          </div>

          {/* Hot Rental Zones */}
          <div className="mt-6 pt-5 border-t border-[var(--border)]/60">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-[var(--text-2)] flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-brand" />
                Trục đường sinh viên hay thuê:
              </span>
              {u.khuVucThueTot.map((kv, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-md bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-1)] font-medium"
                >
                  {kv}
                </span>
              ))}
              {u.quan.map((q, idx) => {
                const slugQ = slugify(quanDB(q));
                return (
                  <Link
                    key={`q-${idx}`}
                    href={`/nha-dat-cho-thue/ho-chi-minh/${slugQ}/phong-tro`}
                    className="px-2.5 py-1 rounded-md bg-[var(--surface-1)] border border-brand/30 text-brand hover:bg-brand/10 font-semibold transition-colors"
                  >
                    Thuê phòng {q} →
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Intro & Overview */}
        <section className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-5 mb-8">
          <h2 className="text-base font-bold text-[var(--text-1)] mb-2 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-brand" />
            Đặc điểm thuê trọ quanh {u.tenVietTat}
          </h2>
          <p className="text-sm text-[var(--text-2)] leading-relaxed">
            {u.moTa}
          </p>
        </section>

        {/* Cross-links theo chuyên đề & mức giá cấp quận tĩnh */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
            <span className="inline-flex items-center min-h-[44px] px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold bg-brand text-white shadow-xs whitespace-nowrap">
              Tất cả giá quanh trường
            </span>
            {boLocChips.map((chip) => (
              <Link
                key={chip.href}
                href={chip.href}
                className="inline-flex items-center min-h-[44px] px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap bg-[var(--surface-1)] text-[var(--text-2)] hover:bg-[var(--surface-2)] border border-[var(--border)]"
              >
                {chip.nhan} →
              </Link>
            ))}
          </div>

          <div className="text-xs text-[var(--text-3)] font-medium">
            Có <span className="font-bold text-[var(--text-1)]">{tongTin.toLocaleString("vi-VN")}</span> phòng cho thuê{tongTin > listings.length ? ` (hiện ${listings.length} tin mới nhất)` : ""}
          </div>
        </div>

        {/* Listings Grid */}
        {listings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {listings.map((item) => (
              <ListingCard key={item.id} x={item} />
            ))}
          </div>
        ) : (
          <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-10 text-center my-6">
            <Building className="w-10 h-10 text-[var(--text-3)] mx-auto mb-3" />
            <p className="text-base font-semibold text-[var(--text-1)]">
              Chưa có phòng thuộc mức giá này quanh {u.tenVietTat}
            </p>
            <p className="text-xs text-[var(--text-3)] mt-1 max-w-md mx-auto">
              Bạn hãy thử chọn khung giá khác hoặc duyệt toàn bộ danh sách phòng cho thuê tại {u.quan.join(", ")}.
            </p>
            <Link
              href={`/phong-tro-gan-truong-dai-hoc/${u.slug}`}
              className="inline-block mt-4 px-4 py-2 rounded-lg bg-brand text-white text-xs font-semibold hover:opacity-90"
            >
              Xem tất cả phòng quanh trường
            </Link>
          </div>
        )}

        {/* Săn phòng hộ CTA */}
        <SanPhongHoCTA
          tieuDe={`Chưa tìm được phòng trọ ưng ý gần ĐH ${u.tenVietTat}?`}
          moTa={`Nhắn tiêu chí (tài chính, khu vực, tiện ích mong muốn), trợ lý Radar sẽ lọc rổ hàng quanh ${u.quan.join(", ")} và gửi bạn 3 lựa chọn tốt nhất trong 15 phút.`}
          tinNhanZalo={`Chào Radar, mình đang cần tìm phòng trọ gần ĐH ${u.tenVietTat} (${u.ten}), tư vấn phòng trống giúp mình nhé!`}
        />

        {/* FAQ Section */}
        {u.faq.length > 0 && (
          <section className="mt-14 bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-6">
              <HelpCircle className="w-5 h-5 text-brand" />
              <h2 className="text-lg sm:text-xl font-bold text-[var(--text-1)]">
                Câu hỏi thường gặp khi thuê phòng gần ĐH {u.tenVietTat}
              </h2>
            </div>

            <div className="space-y-4">
              {u.faq.map((item, idx) => (
                <div
                  key={idx}
                  className="border border-[var(--border)] rounded-xl p-4 bg-[var(--surface-0)]"
                >
                  <h3 className="font-semibold text-sm sm:text-base text-[var(--text-1)] flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{item.q}</span>
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-[var(--text-2)] leading-relaxed pl-6">
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Related Universities */}
        {truongLanCan.length > 0 && (
          <section className="mt-12">
            <h2 className="text-base sm:text-lg font-bold text-[var(--text-1)] mb-4">
              Phòng trọ gần các trường đại học lân cận
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {truongLanCan.map((truong) => (
                <Link
                  key={truong.id}
                  href={`/phong-tro-gan-truong-dai-hoc/${truong.slug}`}
                  className="bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4 transition-all duration-200 group"
                >
                  <div className="text-xs font-bold text-brand mb-1">{truong.tenVietTat}</div>
                  <div className="text-xs font-medium text-[var(--text-1)] line-clamp-1 group-hover:text-brand">
                    {truong.ten}
                  </div>
                  <div className="text-[11px] text-[var(--text-3)] mt-2">
                    {truong.quan.join(", ")}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
