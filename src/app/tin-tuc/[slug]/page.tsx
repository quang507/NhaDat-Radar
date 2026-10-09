import Link from "next/link";
import { notFound } from "next/navigation";
import { dsQuanBaoCao, layBaoCao, thangNay, trieu, TINH_BAO_CAO, type BaoCao } from "@/lib/bao-cao-gia";
import { BAI_VIET, type BaiViet } from "@/lib/bai-viet";
import { tenKhuVucGon } from "@/components/AreaLanding";
import { areaPath } from "@/lib/slug";
import { ldJson, SITE_URL } from "@/lib/ld";
import { HOTLINE, HOTLINE_ZALO } from "@/lib/hotline";
import SafeImg from "@/components/SafeImg";
import { Home, ChevronRight, Calendar, Clock, MessageCircle, ShieldCheck, ArrowRight, Share2, BookOpen } from "lucide-react";

export const revalidate = 43200;
const TIEN_TO = "gia-thue-phong-tro-";

async function timQuan(slug: string) {
  if (!slug.startsWith(TIEN_TO)) return null;
  const qs = await dsQuanBaoCao();
  return qs.find((q) => q.slug === slug.slice(TIEN_TO.length)) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { thang, nam } = thangNay();
  const q = await timQuan(slug).catch(() => null);
  if (q) {
    const bc = await layBaoCao(q.quan).catch(() => null);
    const ten = tenKhuVucGon(q.quan);
    return {
      title: `Giá thuê phòng trọ ${ten} tháng ${thang}/${nam}${bc ? `: phổ biến quanh ${trieu(bc.trungVi)}` : ""} | NhaDat Radar`,
      description: bc
        ? `Giá thuê phòng trọ ${ten} tháng ${thang}/${nam}: phổ biến ${trieu(bc.p25)} - ${trieu(bc.p75)}/tháng, trung vị ${trieu(bc.trungVi)}, từ ${bc.n.toLocaleString("vi-VN")} phòng đang cho thuê. Giá theo diện tích, phường rẻ nhất, xu hướng 30 ngày.`
        : `Giá thuê phòng trọ ${ten} tháng ${thang}/${nam} từ dữ liệu NhaDat Radar.`,
      alternates: { canonical: `/tin-tuc/${slug}` },
      openGraph: {
        type: "article",
        title: `Giá thuê phòng trọ ${ten} tháng ${thang}/${nam} | NhaDat Radar`,
        description: `Báo cáo giá thuê phòng trọ ${ten} mới nhất: trung vị ${bc ? trieu(bc.trungVi) : ""}, tổng hợp từ dữ liệu thật trên NhaDat Radar.`,
        url: `${SITE_URL}/tin-tuc/${slug}`,
        images: [{ url: "/logo.svg", width: 900, height: 900, alt: `Giá thuê phòng trọ ${ten}` }],
      },
      twitter: {
        card: "summary_large_image",
        title: `Giá thuê phòng trọ ${ten} tháng ${thang}/${nam}`,
        description: `Báo cáo giá thuê phòng trọ ${ten} từ dữ liệu NhaDat Radar.`,
        images: ["/logo.svg"],
      },
    };
  }
  const b = BAI_VIET.find((x) => x.slug === slug);
  if (!b) return { title: "Không tìm thấy bài viết - NhaDat Radar" };
  return {
    title: `${b.tieuDe} | NhaDat Radar`,
    description: b.moTa,
    alternates: { canonical: `/tin-tuc/${slug}` },
    openGraph: {
      type: "article",
      title: `${b.tieuDe} | NhaDat Radar`,
      description: b.moTa,
      url: `${SITE_URL}/tin-tuc/${slug}`,
      images: [{ url: b.coverImage || "/logo.svg", width: 1200, height: 630, alt: b.tieuDe }],
    },
    twitter: {
      card: "summary_large_image",
      title: b.tieuDe,
      description: b.moTa,
      images: [b.coverImage || "/logo.svg"],
    },
  };
}

export default async function BaiPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const q = await timQuan(slug).catch(() => null);
  if (q) {
    const bc = await layBaoCao(q.quan).catch(() => null);
    if (!bc) notFound();
    const khac = (await dsQuanBaoCao()).filter((x) => x.slug !== q.slug).slice(0, 12);
    return <BaoCaoQuan bc={bc} slug={slug} khac={khac} />;
  }
  const b = BAI_VIET.find((x) => x.slug === slug);
  if (!b) notFound();
  const lienQuan = BAI_VIET.filter((x) => x.slug !== slug).slice(0, 3);
  return <BaiHuongDan b={b} lienQuan={lienQuan} />;
}

function KhungBai({
  tieuDe,
  ngay,
  moTa,
  categoryName,
  readTime,
  coverImage,
  children,
  ld,
}: {
  tieuDe: string;
  ngay: string;
  moTa: string;
  categoryName?: string;
  readTime?: string;
  coverImage?: string;
  children: React.ReactNode;
  ld: unknown | unknown[];
}) {
  const ldArr = Array.isArray(ld) ? ld : [ld];
  return (
    <article className="max-w-4xl mx-auto px-4 py-6 md:py-8 space-y-6">
      {ldArr.filter(Boolean).map((item, idx) => (
        <script key={idx} type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(item) }} />
      ))}

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand flex items-center gap-1">
          <Home className="w-3.5 h-3.5" />
          <span>Trang chủ</span>
        </Link>
        <ChevronRight className="w-3 h-3 text-slate-400" />
        <Link href="/tin-tuc" className="hover:text-brand">Tin tức &amp; Cẩm nang</Link>
        <ChevronRight className="w-3 h-3 text-slate-400" />
        <span className="text-slate-800 font-medium truncate max-w-[200px] sm:max-w-none">{tieuDe}</span>
      </nav>

      {/* Article Header */}
      <header className="space-y-4 pt-2">
        <div className="flex flex-wrap items-center gap-3">
          {categoryName && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              {categoryName}
            </span>
          )}
          <span className="text-xs text-slate-400 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> {new Date(ngay).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
          </span>
          {readTime && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {readTime}
            </span>
          )}
        </div>

        <h1 className="prata text-2xl sm:text-3xl md:text-4xl text-slate-900 leading-snug tracking-tight">
          {tieuDe}
        </h1>

        <p className="text-base md:text-lg text-slate-600 leading-relaxed font-normal bg-slate-50 border-l-4 border-brand p-4 rounded-r-xl">
          {moTa}
        </p>

        {coverImage && (
          <div className="aspect-[16/9] w-full rounded-2xl overflow-hidden shadow-md mt-6 bg-slate-100">
            <SafeImg
              src={coverImage}
              alt={tieuDe}
              fallbackLabel={categoryName}
              className="w-full h-full object-cover"
            />
          </div>
        )}
      </header>

      {/* Article Content */}
      <div className="pt-4 text-slate-800 leading-relaxed text-base space-y-8">
        {children}
      </div>
    </article>
  );
}

function BaoCaoQuan({ bc, slug, khac }: { bc: BaoCao; slug: string; khac: { quan: string; slug: string; n: number }[] }) {
  const { thang, nam } = thangNay();
  const ten = tenKhuVucGon(bc.quan);
  const tieuDe = `Giá thuê phòng trọ ${ten} tháng ${thang}/${nam}`;
  const moTa = `Tổng hợp từ ${bc.n.toLocaleString("vi-VN")} phòng trọ đang cho thuê tại ${bc.quan} trên NhaDat Radar: phần lớn phòng có giá ${trieu(bc.p25)} - ${trieu(bc.p75)}/tháng, giá giữa (trung vị) là ${trieu(bc.trungVi)}.`;
  const linkPhong = areaPath("cho_thue", TINH_BAO_CAO, bc.quan, "phong_tro");
  const ldArticle = {
    "@context": "https://schema.org", "@type": "Article", headline: tieuDe, description: moTa,
    dateModified: bc.capNhat, author: { "@type": "Organization", name: "NhaDat Radar" },
    publisher: { "@type": "Organization", name: "NhaDat Radar" }, mainEntityOfPage: `${SITE_URL}/tin-tuc/${slug}`,
  };
  const ldBreadcrumb = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Trang chủ", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Tin tức", item: `${SITE_URL}/tin-tuc` },
      { "@type": "ListItem", position: 3, name: tieuDe, item: `${SITE_URL}/tin-tuc/${slug}` },
    ],
  };
  return (
    <KhungBai tieuDe={tieuDe} ngay={bc.capNhat} moTa={moTa} categoryName="Báo cáo giá thuê" ld={[ldArticle, ldBreadcrumb]}>
      {/* Thống kê 4 ô nổi bật */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {[
          ["Giá trung vị", trieu(bc.trungVi)],
          ["Khoảng phổ biến", `${trieu(bc.p25)} - ${trieu(bc.p75)}`],
          ["Giá theo m²", bc.giaM2 ? `${Math.round(bc.giaM2 / 1000).toLocaleString("vi-VN")}k / m²` : "-"],
          ["Tổng phòng", `${bc.n.toLocaleString("vi-VN")} phòng`],
        ].map(([k, v]) => (
          <div key={k} className="card rounded-2xl p-4 border border-slate-200/80 bg-white shadow-xs">
            <div className="text-xs text-slate-500">{k}</div>
            <div className="font-bold text-brand text-lg sm:text-xl mt-1">{v}</div>
          </div>
        ))}
      </div>

      {bc.xuHuong && (
        <section className="space-y-2">
          <h2 className="font-bold text-xl text-slate-900">Biến động giá thuê 30 ngày qua</h2>
          <p className="text-slate-700">
            Giá thuê tính theo m² của phòng trọ {ten}{" "}
            {bc.xuHuong.pct > 0.5 ? "tăng" : bc.xuHuong.pct < -0.5 ? "giảm" : "gần như đi ngang"}{" "}
            khoảng <b className="text-slate-900">{Math.abs(bc.xuHuong.pct).toLocaleString("vi-VN")}%</b>{" "}
            trong 30 ngày qua ({Math.round(bc.xuHuong.truoc / 1000)}k → {Math.round(bc.xuHuong.nay / 1000)}k/m²).
          </p>
        </section>
      )}

      {bc.theoDienTich.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-xl text-slate-900">Mặt bằng giá theo diện tích</h2>
            <span className="text-xs text-slate-400">Bấm để xem danh sách phòng</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-2.5">
            {bc.theoDienTich.map((d) => {
              const searchUrl = `/search?deal=cho_thue&province=${encodeURIComponent(TINH_BAO_CAO)}&district=${encodeURIComponent(bc.quan)}`;
              return (
                <Link
                  key={d.nhan}
                  href={searchUrl}
                  className="group card rounded-xl p-3 border border-slate-200/80 bg-slate-50 hover:bg-white hover:border-brand hover:shadow-xs transition-all flex items-center justify-between"
                  title={`Xem danh sách phòng tại ${ten}`}
                >
                  <span className="font-semibold text-slate-700 text-sm group-hover:text-brand transition-colors flex items-center gap-1.5">
                    <span>{d.nhan}</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-brand" />
                  </span>
                  <span className="font-bold text-brand text-sm">{trieu(d.trungVi)} <span className="text-xs text-slate-400 font-normal">({d.n} phòng)</span></span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {bc.theoPhuong.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-xl text-slate-900">Phường có giá thuê dễ chịu nhất ở {ten}</h2>
            <span className="text-xs text-slate-400">Bấm phường để xem phòng cụ thể</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-2.5">
            {bc.theoPhuong.map((p) => {
              const searchUrl = `/search?deal=cho_thue&province=${encodeURIComponent(TINH_BAO_CAO)}&district=${encodeURIComponent(bc.quan)}&q=${encodeURIComponent(p.phuong)}`;
              return (
                <Link
                  key={p.phuong}
                  href={searchUrl}
                  className="group card rounded-xl p-3 border border-slate-200/80 bg-white hover:border-brand hover:shadow-xs transition-all flex items-center justify-between"
                  title={`Xem ${p.n} phòng cho thuê tại ${p.phuong}`}
                >
                  <span className="font-semibold text-slate-800 text-sm group-hover:text-brand transition-colors flex items-center gap-1.5">
                    <span>{p.phuong}</span>
                    <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-brand" />
                  </span>
                  <span className="font-bold text-emerald-700 text-sm">{trieu(p.trungVi)} <span className="text-xs text-slate-400 font-normal">({p.n} phòng)</span></span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {bc.canHo && (
        <section className="space-y-2">
          <h2 className="font-bold text-xl text-slate-900">So với căn hộ dịch vụ / studio</h2>
          <p className="text-slate-700">
            Căn hộ cho thuê tại {ten} có giá trung vị <b className="text-brand">{trieu(bc.canHo.trungVi)}</b>/tháng ({bc.canHo.n} căn) — cao hơn phòng trọ thường nhưng đã trang bị đầy đủ nội thất, thang máy và dịch vụ quản lý tiện nghi.
          </p>
        </section>
      )}

      {/* Call to Action Card */}
      <section className="card rounded-2xl p-6 border border-emerald-200 bg-emerald-50/50 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <h2 className="font-bold text-lg text-slate-900">Xem {bc.n.toLocaleString("vi-VN")} phòng trọ {ten} đã xác minh còn trống</h2>
        </div>
        <p className="text-sm text-slate-600">
          Hình ảnh thực tế, mức giá minh bạch, phòng trống đã xác thực trên NhaDat Radar — hỗ trợ xem phòng miễn phí và thương lượng trực tiếp với chủ nhà.
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <Link href={linkPhong} className="btn btn-primary inline-flex items-center gap-1.5 shadow-sm">
            <span>Xem phòng trọ {ten}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href={HOTLINE_ZALO}
            target="_blank"
            rel="noopener noreferrer"
            className="btn border border-[#0068ff]/30 text-[#0068ff] bg-white hover:bg-blue-50/50 inline-flex items-center gap-2 font-semibold shadow-xs"
          >
            <MessageCircle className="w-4 h-4 text-[#0068ff]" />
            <span>Nhắn Zalo xem phòng ({HOTLINE})</span>
          </a>
        </div>
      </section>

      {khac.length > 0 && (
        <section className="pt-6 border-t border-slate-200/80 space-y-3">
          <h2 className="font-bold text-lg text-slate-900">Xem giá thuê phòng trọ các quận lân cận</h2>
          <div className="flex flex-wrap gap-2">
            {khac.map((k) => (
              <Link
                key={k.slug}
                href={`/tin-tuc/gia-thue-phong-tro-${k.slug}`}
                className="text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:border-brand hover:text-brand font-medium transition-colors"
              >
                {tenKhuVucGon(k.quan)}
              </Link>
            ))}
          </div>
        </section>
      )}
    </KhungBai>
  );
}

function BaiHuongDan({ b, lienQuan }: { b: BaiViet; lienQuan?: BaiViet[] }) {
  const ldArticle = {
    "@context": "https://schema.org", "@type": "Article", headline: b.tieuDe, description: b.moTa,
    datePublished: b.ngay, dateModified: b.ngay, author: { "@type": "Organization", name: "NhaDat Radar" },
    publisher: { "@type": "Organization", name: "NhaDat Radar" }, mainEntityOfPage: `${SITE_URL}/tin-tuc/${b.slug}`,
  };
  const ldBreadcrumb = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Trang chủ", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Tin tức", item: `${SITE_URL}/tin-tuc` },
      { "@type": "ListItem", position: 3, name: b.tieuDe, item: `${SITE_URL}/tin-tuc/${b.slug}` },
    ],
  };
  const ldFaq = {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: b.muc.map((m) => ({
      "@type": "Question",
      name: m.h2.replace(/^\d+\.\s*/, ""),
      acceptedAnswer: {
        "@type": "Answer",
        text: [...(m.doan || []), ...(m.ds ? [m.ds.join(". ")] : [])].join(" "),
      },
    })),
  };

  return (
    <KhungBai
      tieuDe={b.tieuDe}
      ngay={b.ngay}
      moTa={b.moTa}
      categoryName={b.categoryName}
      readTime={b.readTime}
      coverImage={b.coverImage}
      ld={[ldArticle, ldBreadcrumb, ldFaq]}
    >
      {/* Table of Contents */}
      {b.muc.length > 2 && (
        <div className="card rounded-2xl p-5 border border-slate-200/80 bg-slate-50/80 my-4 space-y-2">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Mục lục bài viết</span>
          </div>
          <ol className="list-decimal pl-5 text-sm text-slate-700 space-y-1 font-medium">
            {b.muc.map((m, idx) => (
              <li key={idx}>
                <a href={`#muc-${idx}`} className="hover:text-brand hover:underline">
                  {m.h2}
                </a>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Sections */}
      {b.muc.map((m, idx) => (
        <section key={m.h2} id={`muc-${idx}`} className="space-y-3 pt-2 scroll-mt-20">
          <h2 className="font-bold text-xl md:text-2xl text-slate-900 flex items-center gap-2">
            <span className="w-1.5 h-6 rounded-full bg-brand shrink-0" />
            <span>{m.h2}</span>
          </h2>
          {m.doan?.map((d, i) => (
            <p key={i} className="text-slate-700 leading-relaxed text-base">
              {d}
            </p>
          ))}
          {m.ds && (
            <ul className="space-y-2 pl-2">
              {m.ds.map((d, i) => (
                <li key={i} className="flex items-start gap-2 text-slate-700 text-base leading-relaxed">
                  <span className="w-2 h-2 rounded-full bg-brand mt-2 shrink-0" />
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          )}
          {m.lienKet && (
            <div className="flex flex-wrap gap-2.5 pt-2">
              {m.lienKet.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:border-brand hover:text-brand shadow-xs transition-colors flex items-center gap-1"
                >
                  <span>{l.nhan}</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              ))}
            </div>
          )}
        </section>
      ))}

      {/* CTA Support Box */}
      <section className="card rounded-3xl p-6 sm:p-8 border border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/40 shadow-sm space-y-4 my-8">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-emerald-600" />
          <h3 className="font-bold text-xl text-slate-900">Đồng hành cùng bạn trên thị trường BĐS</h3>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          NhaDat Radar giúp bạn tìm kiếm, thẩm định giá và xác minh thông tin nhà đất khắp Việt Nam. Chúng tôi cam kết dữ liệu minh bạch, hình ảnh thực tế và hỗ trợ thương lượng trực tiếp chủ nhà.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link href="/search" className="btn btn-primary inline-flex items-center gap-1.5">
            <span>Tìm nhà đất ngay</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href={HOTLINE_ZALO}
            target="_blank"
            rel="noopener noreferrer"
            className="btn border border-[#0068ff]/30 text-[#0068ff] bg-white hover:bg-blue-50/50 inline-flex items-center gap-2 font-semibold"
          >
            <MessageCircle className="w-4 h-4 text-[#0068ff]" />
            <span>Tư vấn qua Zalo ({HOTLINE})</span>
          </a>
        </div>
      </section>

      {/* Related Articles */}
      {lienQuan && lienQuan.length > 0 && (
        <section className="pt-8 border-t border-slate-200/80 space-y-4">
          <h3 className="font-bold text-xl text-slate-900">Bài viết liên quan</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            {lienQuan.map((item) => (
              <Link
                key={item.slug}
                href={`/tin-tuc/${item.slug}`}
                className="group card rounded-2xl overflow-hidden border border-slate-200/80 bg-white hover:border-slate-300 hover:shadow-md transition-all flex flex-col"
              >
                <div className="aspect-[16/10] relative overflow-hidden bg-slate-100">
                  <SafeImg
                    src={item.coverImage}
                    alt={item.tieuDe}
                    fallbackLabel={item.categoryName}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  <h4 className="font-semibold text-sm text-slate-900 group-hover:text-brand transition-colors line-clamp-2 leading-snug">
                    {item.tieuDe}
                  </h4>
                  <div className="text-[0.7rem] text-slate-400 mt-2 flex items-center justify-between">
                    <span>{item.readTime}</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform text-brand" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </KhungBai>
  );
}
