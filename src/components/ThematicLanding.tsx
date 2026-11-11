import Link from "next/link";
import { notFound } from "next/navigation";
import { DANH_SACH_CHUYEN_DE, quanDB } from "@/lib/chuyen-de";
import { cheSoTin } from "@/lib/doc-quyen";
import { createAnonClient } from "@/lib/supabase/anon";
import { LISTING_CARD_COLS } from "@/lib/cols";
import type { Listing } from "@/lib/types";
import ListingCard from "@/components/ListingCard";
import SanPhongHoCTA from "@/components/SanPhongHoCTA";
import { ldJson, SITE_URL } from "@/lib/ld";
import { slugify } from "@/lib/slug";
import {
  Sparkles,
  MapPin,
  DollarSign,
  ChevronRight,
  HelpCircle,
  Building,
  CheckCircle2,
  ShieldCheck,
  Compass,
  SlidersHorizontal,
} from "lucide-react";

export default async function ThematicLanding({
  slug,
  searchParams,
}: {
  slug: string;
  searchParams?: Promise<{ quan?: string }>;
}) {
  const cd = DANH_SACH_CHUYEN_DE[slug];
  if (!cd) {
    notFound();
  }

  // 2/11 (audit): chỉ nhận quận có trong danh sách chip - giá trị lạ không đi vào truy vấn
  const sp = searchParams ? await searchParams : {};
  const quanGo = sp.quan;
  const quan = quanGo && cd.khuVucNhieuTin.includes(quanGo) ? quanGo : undefined;

  // Truy vấn tin theo chủ đề (count exact -> hiện tổng tin thật, không phải số thẻ đang hiện)
  const supabase = createAnonClient();
  let query = supabase
    .from("listings")
    .select(LISTING_CARD_COLS, { count: "exact" })
    .eq("status", "published")
    .eq("deal", cd.deal)
    .ilike("province", "%Hồ Chí Minh%");

  // Áp dụng bộ lọc chuyên đề
  if (cd.filterType === "price_lte" && cd.priceMax) {
    query = query.lte("price_vnd", cd.priceMax);
  } else if (cd.filterType === "price_range" && cd.priceMin && cd.priceMax) {
    query = query.gte("price_vnd", cd.priceMin).lte("price_vnd", cd.priceMax);
  } else if (cd.filterType === "keyword" && cd.keywords?.length) {
    // Tìm kiếm trong tiêu đề hoặc mô tả
    const kwFilter = cd.keywords.map((kw) => `title.ilike.%${kw}%,description.ilike.%${kw}%`).join(",");
    query = query.or(kwFilter);
  } else if (cd.filterType === "kind_or_keyword" && cd.keywords?.length) {
    const kwFilter = cd.keywords.map((kw) => `title.ilike.%${kw}%,description.ilike.%${kw}%`).join(",");
    query = query.or(`kind.eq.can_ho,${kwFilter}`);
  }

  // Lọc thêm theo quận nếu người dùng bấm chọn quận
  // 2/11 (audit 🔴7, Q1): so khớp đúng tên quận trong DB - ilike "%Quận 1%" ăn cả Quận 10/11/12,
  // tên trần "Gò Vấp" phải đổi thành "Quận Gò Vấp"
  if (quan) {
    query = query.eq("district", quanDB(quan));
  }

  const { data: rawListings, count } = await query
    .order("first_seen_at", { ascending: false, nullsFirst: false })
    .limit(30);

  // 2/11 (audit P4): che SĐT trong tiêu đề/mô tả như mọi trang công khai khác
  const listings = ((rawListings || []) as Listing[]).map(cheSoTin);
  const tongTin = count ?? listings.length;

  // JSON-LD Schemas
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
        name: cd.title,
        item: `${SITE_URL}/${cd.slug}`,
      },
    ],
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: cd.faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.a,
      },
    })),
  };

  // Các chủ đề khác để liên kết chéo
  const cacChuyenDeKhac = Object.values(DANH_SACH_CHUYEN_DE).filter(
    (item) => item.slug !== cd.slug
  );

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
            <span className="text-[var(--text-1)] font-medium">{cd.title}</span>
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/15 text-brand text-xs font-bold mb-3">
                <Sparkles className="w-4 h-4" />
                CHUYÊN ĐỀ PHÒNG TRỌ HOT TP.HCM
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[var(--text-1)]">
                {cd.h1}
              </h1>
              <p className="mt-3 text-sm sm:text-base text-[var(--text-2)] max-w-3xl leading-relaxed">
                {cd.leadText}
              </p>
            </div>

            {/* Quick stats box */}
            <div className="bg-[var(--surface-1)] border border-[var(--border)] rounded-xl p-4 flex sm:flex-col justify-between sm:justify-center gap-2 min-w-[220px] shadow-xs">
              <div className="text-xs text-[var(--text-3)]">Mức giá trung bình:</div>
              <div className="text-lg sm:text-xl font-extrabold text-brand flex items-center gap-1">
                <DollarSign className="w-5 h-5 shrink-0" />
                {cd.mucGiaPhoBien}
              </div>
              <div className="text-[11px] text-[var(--text-3)] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Cập nhật phòng trống mỗi ngày
              </div>
            </div>
          </div>

          {/* Hot Districts Links - Chuyển sang URL quận chuẩn SEO để thông dòng PageRank */}
          <div className="mt-6 pt-5 border-t border-[var(--border)]/60">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-[var(--text-2)] flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-brand" />
                Xem theo quận nhiều phòng:
              </span>
              <span className="px-2.5 py-1 rounded-md font-medium bg-brand text-white shadow-xs">
                Toàn TP.HCM
              </span>
              {cd.khuVucNhieuTin.map((kv, idx) => {
                const slugQuan = slugify(quanDB(kv));
                const boLoc = cd.slug === "phong-tro-duoi-3-trieu"
                  ? "/duoi-3-trieu"
                  : cd.slug === "phong-tro-co-gac-lung"
                    ? "/gac-lung"
                    : cd.slug === "can-ho-mini-full-noi-that"
                      ? "/full-noi-that"
                      : "";
                const linkQuan = `/nha-dat-cho-thue/ho-chi-minh/${slugQuan}/phong-tro${boLoc}`;
                return (
                  <Link
                    key={idx}
                    href={linkQuan}
                    className="px-2.5 py-1 rounded-md font-medium bg-[var(--surface-1)] border border-[var(--border)] text-[var(--text-1)] hover:bg-[var(--surface-2)] transition-colors"
                  >
                    {kv} →
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-brand" />
            <h2 className="text-base sm:text-lg font-bold text-[var(--text-1)]">
              Danh sách phòng đang cho thuê {quan ? `tại ${quan}` : "tại TP.HCM"}
            </h2>
          </div>
          <span className="text-xs text-[var(--text-3)] font-medium">
            Có <strong className="text-[var(--text-1)]">{tongTin.toLocaleString("vi-VN")}</strong> tin phù hợp
          </span>
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
              Chưa có phòng thỏa mãn tại khu vực {quan || "này"}
            </p>
            <p className="text-xs text-[var(--text-3)] mt-1 max-w-md mx-auto">
              Bạn hãy thử chọn khu vực khác hoặc quay lại xem toàn bộ danh sách phòng cho thuê.
            </p>
            <Link
              href={`/${cd.slug}`}
              className="inline-block mt-4 px-4 py-2 rounded-lg bg-brand text-white text-xs font-semibold hover:opacity-90"
            >
              Xem tất cả khu vực
            </Link>
          </div>
        )}

        {/* Săn phòng hộ CTA */}
        <SanPhongHoCTA
          tieuDe={`Cần tìm gấp ${cd.title.toLowerCase()}?`}
          moTa={`Nhắn mức giá và khu vực mong muốn, trợ lý Radar sẽ đối chiếu rổ hàng phòng trống của Radar và gửi bạn 3 lựa chọn phù hợp nhất trong 15 phút.`}
          tinNhanZalo={`Chào Radar, mình đang cần tìm ${cd.title.toLowerCase()} tại TP.HCM, gửi mình danh sách phòng trống tốt nhất nhé!`}
        />

        {/* FAQ Section */}
        {cd.faq.length > 0 && (
          <section className="mt-14 bg-[var(--surface-1)] border border-[var(--border)] rounded-2xl p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-6">
              <HelpCircle className="w-5 h-5 text-brand" />
              <h2 className="text-lg sm:text-xl font-bold text-[var(--text-1)]">
                Câu hỏi thường gặp: {cd.title}
              </h2>
            </div>

            <div className="space-y-4">
              {cd.faq.map((item, idx) => (
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

        {/* Other Themes Cross-links */}
        <section className="mt-12">
          <h2 className="text-base sm:text-lg font-bold text-[var(--text-1)] mb-4">
            Khám phá các chuyên đề phòng trọ khác
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {cacChuyenDeKhac.map((chuyenDe) => (
              <Link
                key={chuyenDe.slug}
                href={`/${chuyenDe.slug}`}
                className="bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4 transition-all duration-200 group"
              >
                <div className="text-xs font-bold text-brand mb-1">CHUYÊN ĐỀ HOT</div>
                <div className="text-sm font-semibold text-[var(--text-1)] group-hover:text-brand line-clamp-1">
                  {chuyenDe.title}
                </div>
                <div className="text-xs text-[var(--text-3)] mt-1.5 line-clamp-1">
                  {chuyenDe.mucGiaPhoBien}
                </div>
              </Link>
            ))}
            <Link
              href="/phong-tro-gan-truong-dai-hoc"
              className="bg-[var(--surface-1)] hover:bg-[var(--surface-2)] border border-[var(--border)] rounded-xl p-4 transition-all duration-200 group"
            >
              <div className="text-xs font-bold text-brand mb-1">SINH VIÊN ĐẠI HỌC</div>
              <div className="text-sm font-semibold text-[var(--text-1)] group-hover:text-brand line-clamp-1">
                Phòng trọ gần 15+ trường Đại học TP.HCM
              </div>
              <div className="text-xs text-[var(--text-3)] mt-1.5 line-clamp-1">
                HUTECH, Bách Khoa, UEH, TDTU...
              </div>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
