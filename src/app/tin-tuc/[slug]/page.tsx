import Link from "next/link";
import { notFound } from "next/navigation";
import { dsQuanBaoCao, layBaoCao, thangNay, trieu, TINH_BAO_CAO, type BaoCao } from "@/lib/bao-cao-gia";
import { BAI_VIET, type BaiViet } from "@/lib/bai-viet";
import { tenKhuVucGon } from "@/components/AreaLanding";
import { areaPath } from "@/lib/slug";
import { ldJson, SITE_URL } from "@/lib/ld";
import { HOTLINE, HOTLINE_ZALO } from "@/lib/hotline";

// /tin-tuc/gia-thue-phong-tro-<quận> : báo cáo giá từ số liệu thật (lib/bao-cao-gia)
// /tin-tuc/<slug bài>               : bài hướng dẫn cố định (lib/bai-viet)
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
      images: [{ url: "/logo.svg", width: 900, height: 900, alt: b.tieuDe }],
    },
    twitter: {
      card: "summary_large_image",
      title: b.tieuDe,
      description: b.moTa,
      images: ["/logo.svg"],
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
  return <BaiHuongDan b={b} />;
}

function KhungBai({ tieuDe, ngay, moTa, children, ld }: { tieuDe: string; ngay: string; moTa: string; children: React.ReactNode; ld: unknown | unknown[] }) {
  const ldArr = Array.isArray(ld) ? ld : [ld];
  return (
    <article className="max-w-3xl mx-auto">
      {ldArr.filter(Boolean).map((item, idx) => (
        <script key={idx} type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(item) }} />
      ))}
      <nav className="text-xs text-[var(--ink-soft)] mb-2"><Link href="/" className="hover:text-brand">Trang chủ</Link> / <Link href="/tin-tuc" className="hover:text-brand">Tin tức</Link></nav>
      <h1 className="prata text-2xl md:text-3xl leading-snug">{tieuDe}</h1>
      <p className="text-xs text-[var(--ink-faint)] mt-1">NhaDat Radar · cập nhật {new Date(ngay).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</p>
      <p className="text-[var(--ink-soft)] mt-3">{moTa}</p>
      <div className="mt-6 flex flex-col gap-6 leading-relaxed">{children}</div>
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
    <KhungBai tieuDe={tieuDe} ngay={bc.capNhat} moTa={moTa} ld={[ldArticle, ldBreadcrumb]}>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[["Giá trung vị", trieu(bc.trungVi)], ["Phổ biến", `${trieu(bc.p25)} - ${trieu(bc.p75)}`], ["Giá/m²", bc.giaM2 ? `${Math.round(bc.giaM2 / 1000).toLocaleString("vi-VN")}k` : "-"], ["Số phòng", bc.n.toLocaleString("vi-VN")]].map(([k, v]) => (
          <div key={k} className="card rounded-lg p-3"><div className="text-xs text-[var(--ink-soft)]">{k}</div><div className="font-bold text-brand text-lg">{v}</div></div>
        ))}
      </div>

      {bc.xuHuong && (
        <section>
          <h2 className="font-bold text-lg mb-2">Giá đang tăng hay giảm?</h2>
          <p>Giá thuê tính theo m² của phòng trọ {ten} {bc.xuHuong.pct > 0.5 ? "tăng" : bc.xuHuong.pct < -0.5 ? "giảm" : "gần như đi ngang"} khoảng <b>{Math.abs(bc.xuHuong.pct).toLocaleString("vi-VN")}%</b> trong 30 ngày qua ({Math.round(bc.xuHuong.truoc / 1000)}k → {Math.round(bc.xuHuong.nay / 1000)}k/m²).</p>
        </section>
      )}

      {bc.theoDienTich.length > 0 && (
        <section>
          <h2 className="font-bold text-lg mb-2">Giá thuê theo diện tích</h2>
          <ul className="list-disc pl-5">{bc.theoDienTich.map((d) => <li key={d.nhan}>{d.nhan}: khoảng <b>{trieu(d.trungVi)}</b>/tháng ({d.n} phòng)</li>)}</ul>
        </section>
      )}

      {bc.theoPhuong.length > 0 && (
        <section>
          <h2 className="font-bold text-lg mb-2">Phường có giá thuê dễ chịu nhất ở {ten}</h2>
          <ul className="list-disc pl-5">{bc.theoPhuong.map((p) => <li key={p.phuong}>{p.phuong}: trung vị <b>{trieu(p.trungVi)}</b> ({p.n} phòng)</li>)}</ul>
        </section>
      )}

      {bc.canHo && (
        <section>
          <h2 className="font-bold text-lg mb-2">So với căn hộ dịch vụ / studio</h2>
          <p>Căn hộ cho thuê tại {ten} có giá trung vị <b>{trieu(bc.canHo.trungVi)}</b>/tháng ({bc.canHo.n} căn) - cao hơn phòng trọ nhưng thường đã có nội thất, thang máy và dịch vụ dọn phòng.</p>
        </section>
      )}

      <section className="card rounded-xl p-5 border-brand/40 bg-brand/5">
        <h2 className="font-bold text-lg">Xem {bc.n.toLocaleString("vi-VN")} phòng trọ {ten} đang trống</h2>
        <p className="text-sm text-[var(--ink-soft)] mt-1">Ảnh thật, giá rõ ràng, phòng rổ hàng đã xác thực còn trống - hẹn xem phòng miễn phí.</p>
        <div className="flex flex-wrap gap-2 mt-3 items-center">
          <Link href={linkPhong} className="btn btn-primary">Xem phòng trọ {ten} ›</Link>
          <a href={HOTLINE_ZALO} target="_blank" rel="noopener noreferrer" className="btn border-emerald-600 text-emerald-700 hover:bg-emerald-50">
            💬 Nhắn Zalo xem phòng ({HOTLINE})
          </a>
        </div>
      </section>

      <section>
        <h2 className="font-bold text-lg mb-2">Cách Radar tính</h2>
        <p className="text-sm text-[var(--ink-soft)]">Lấy tối đa 1.000 phòng trọ cho thuê mới nhất tại {bc.quan} đang hiển thị trên NhaDat Radar (từ rổ hàng đối tác và các nguồn công khai), bỏ giá bất thường, tính giá trung vị và khoảng phổ biến (25% - 75%). Số liệu tự cập nhật mỗi ngày, chỉ mang tính tham khảo.</p>
      </section>

      {khac.length > 0 && (
        <section>
          <h2 className="font-bold text-lg mb-2">Giá thuê phòng trọ các quận khác</h2>
          <div className="flex flex-wrap gap-2">
            {khac.map((k) => <Link key={k.slug} href={`/tin-tuc/gia-thue-phong-tro-${k.slug}`} className="text-sm px-3 py-1.5 rounded-lg border border-[var(--line)] hover:border-brand hover:text-brand">{tenKhuVucGon(k.quan)}</Link>)}
          </div>
        </section>
      )}
    </KhungBai>
  );
}

function BaiHuongDan({ b }: { b: BaiViet }) {
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
    <KhungBai tieuDe={b.tieuDe} ngay={b.ngay} moTa={b.moTa} ld={[ldArticle, ldBreadcrumb, ldFaq]}>
      {b.muc.map((m) => (
        <section key={m.h2}>
          <h2 className="font-bold text-lg mb-2">{m.h2}</h2>
          {m.doan?.map((d, i) => <p key={i} className="mb-2">{d}</p>)}
          {m.ds && <ul className="list-disc pl-5 flex flex-col gap-1">{m.ds.map((d) => <li key={d}>{d}</li>)}</ul>}
          {m.lienKet && (
            <div className="flex flex-wrap gap-2 mt-3">
              {m.lienKet.map((l) => <Link key={l.href} href={l.href} className="text-sm px-3 py-1.5 rounded-lg border border-[var(--line)] hover:border-brand hover:text-brand">{l.nhan} ›</Link>)}
            </div>
          )}
        </section>
      ))}
      <section className="card rounded-xl p-5 border-brand/40 bg-brand/5">
        <h2 className="font-bold text-lg">Tìm phòng trọ đã xác thực</h2>
        <p className="text-sm text-[var(--ink-soft)] mt-1">Hơn 14.000 phòng trống có ảnh thật, giá rõ ràng - hẹn xem phòng và hỗ trợ thương lượng trực tiếp chủ nhà.</p>
        <div className="flex flex-wrap gap-2 mt-3 items-center">
          <Link href="/nha-dat-cho-thue" className="btn btn-primary">Xem phòng cho thuê ›</Link>
          <a href={HOTLINE_ZALO} target="_blank" rel="noopener noreferrer" className="btn border-emerald-600 text-emerald-700 hover:bg-emerald-50">
            💬 Nhắn Zalo tư vấn ({HOTLINE})
          </a>
          <Link href="/tin-tuc" className="btn">Giá thuê theo quận</Link>
        </div>
      </section>
    </KhungBai>
  );
}
