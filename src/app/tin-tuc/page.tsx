import Link from "next/link";
import { dsQuanBaoCao, thangNay, TINH_BAO_CAO } from "@/lib/bao-cao-gia";
import { BAI_VIET } from "@/lib/bai-viet";
import { tenKhuVucGon } from "@/components/AreaLanding";

// TIN TỨC (3/10, SEO): báo cáo giá thuê phòng trọ từng quận (số liệu thật, cập nhật mỗi ngày) + bài hướng dẫn.
export const revalidate = 43200;

export async function generateMetadata() {
  const { thang, nam } = thangNay();
  return {
    title: `Tin tức & giá thuê phòng trọ TP.HCM tháng ${thang}/${nam} | NhaDat Radar`,
    description: `Giá thuê phòng trọ từng quận TP.HCM tháng ${thang}/${nam} từ dữ liệu thật của NhaDat Radar, kèm kinh nghiệm thuê trọ, checklist xem phòng.`,
    alternates: { canonical: "/tin-tuc" },
  };
}

export default async function TinTucPage() {
  const { thang, nam } = thangNay();
  const quans = await dsQuanBaoCao().catch(() => []);
  return (
    <div className="max-w-4xl mx-auto">
      <nav className="text-xs text-[var(--ink-soft)] mb-2"><Link href="/" className="hover:text-brand">Trang chủ</Link> / Tin tức</nav>
      <h1 className="prata text-2xl md:text-3xl">Tin tức &amp; giá thuê phòng trọ</h1>
      <p className="text-sm text-[var(--ink-soft)] mt-1">Số liệu lấy từ hàng chục nghìn phòng đang cho thuê trên NhaDat Radar, cập nhật mỗi ngày.</p>

      <h2 className="font-bold text-lg mt-8 mb-3">Giá thuê phòng trọ {TINH_BAO_CAO} tháng {thang}/{nam} theo quận</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {quans.map((q) => (
          <Link key={q.slug} href={`/tin-tuc/gia-thue-phong-tro-${q.slug}`}
            className="card rounded-lg px-4 py-3 hover:border-brand transition flex items-center gap-3">
            <span className="font-semibold">Giá thuê phòng trọ {tenKhuVucGon(q.quan)}</span>
            <span className="ml-auto text-xs text-[var(--ink-faint)] tabular-nums">{q.n.toLocaleString("vi-VN")} phòng</span>
          </Link>
        ))}
        {!quans.length && <p className="text-sm text-[var(--ink-soft)]">Đang tổng hợp số liệu.</p>}
      </div>

      <h2 className="font-bold text-lg mt-10 mb-3">Kinh nghiệm thuê nhà</h2>
      <div className="flex flex-col gap-3">
        {BAI_VIET.map((b) => (
          <Link key={b.slug} href={`/tin-tuc/${b.slug}`} className="card rounded-lg p-4 hover:border-brand transition">
            <div className="font-semibold">{b.tieuDe}</div>
            <p className="text-sm text-[var(--ink-soft)] mt-1 line-clamp-2">{b.moTa}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
