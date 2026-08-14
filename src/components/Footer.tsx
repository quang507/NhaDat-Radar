import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-[var(--line)] bg-[var(--surface)]">
      <div className="max-w-6xl mx-auto px-5 py-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <div>
          <div className="flex items-center gap-2 font-extrabold tracking-tight mb-3">
            <span className="w-7 h-7 rounded-lg grid place-items-center text-white text-sm bg-gradient-to-br from-brand to-brand-2">◎</span>
            NhaDat<span className="text-brand">Radar</span>
          </div>
          <p className="text-[var(--ink-soft)]">
            Sàn nhà đất bán &amp; cho thuê: tổng hợp tin đa nguồn, AI chuẩn hoá, chấm điểm tin cậy
            và cảnh báo giá ảo — giúp bạn tìm ngôi nhà mơ ước nhanh hơn.
          </p>
        </div>
        <div>
          <div className="font-bold mb-3">Khám phá</div>
          <ul className="space-y-2 text-[var(--ink-soft)]">
            <li><Link className="hover:text-brand" href="/search">Tìm kiếm bất động sản</Link></li>
            <li><Link className="hover:text-brand" href="/search?deal=ban">Nhà đất bán</Link></li>
            <li><Link className="hover:text-brand" href="/search?deal=cho_thue">Nhà đất cho thuê</Link></li>
            <li><Link className="hover:text-brand" href="/projects">Dự án nổi bật</Link></li>
            <li><Link className="hover:text-brand" href="/thong-ke">Phân tích thị trường</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-bold mb-3">Hướng dẫn</div>
          <ul className="space-y-2 text-[var(--ink-soft)]">
            <li><Link className="hover:text-brand" href="/huong-dan/mua">Hướng dẫn mua &amp; thuê</Link></li>
            <li><Link className="hover:text-brand" href="/huong-dan/ban">Hướng dẫn bán</Link></li>
            <li><Link className="hover:text-brand" href="/tinh-lai-vay">Máy tính lãi vay</Link></li>
            <li><Link className="hover:text-brand" href="/agents">Người bán chuyên nghiệp</Link></li>
          </ul>
        </div>
        <div>
          <div className="font-bold mb-3">Dành cho người bán</div>
          <ul className="space-y-2 text-[var(--ink-soft)]">
            <li><Link className="hover:text-brand" href="/ban">Đăng bán bất động sản</Link></li>
            <li><Link className="hover:text-brand" href="/dashboard">Quản lý tin đăng</Link></li>
            <li><Link className="hover:text-brand" href="/auth">Đăng nhập / Đăng ký</Link></li>
            <li><Link className="hover:text-brand" href="/yeu-thich">Tin đã lưu ♥</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-[var(--line)] py-4 text-center text-xs text-[var(--ink-faint)]">
        © {new Date().getFullYear()} NhaDat Radar. Dữ liệu tổng hợp từ nhiều nguồn công khai, chỉ mang tính tham khảo.
      </div>
    </footer>
  );
}
