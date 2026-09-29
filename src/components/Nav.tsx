import Link from "next/link";
import NavFav from "./NavFav";
import NavAuth from "./NavAuth";
import MobileMenu from "./MobileMenu";

// Nav KHÔNG đọc cookie nữa (23/9): nó nằm trong layout gốc nên mỗi lần gọi auth.getUser() là ép
// toàn bộ site render động, không trang nào được cache. Trạng thái đăng nhập do NavAuth (client) lo.
export default function Nav() {

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--surface)]">
      <div className="relative max-w-6xl mx-auto px-5 py-3 flex items-center gap-3">
        <MobileMenu />
        {/* logo KHÔNG được co (từng bị min-w-0 -> chữ hiệu tràn đè lên menu khi đã đăng nhập, 16/8) */}
        <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight whitespace-nowrap shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="NhaDat Radar" className="w-8 h-8 rounded-lg object-contain shrink-0" />
          {/* mobile <420px: chữ hiệu bị cắt "NhaDat Rac…" (UX audit 16/8) -> ẩn chữ, giữ logo */}
          <span className="hidden min-[420px]:inline">NhaDat&nbsp;<span className="text-brand">Radar</span></span>
        </Link>
        {/* menu ngang chỉ từ lg (1024px): ở md khi đăng nhập có thêm ♥/chat/avatar/Đăng tin/Đăng xuất -> không đủ chỗ */}
        <nav className="hidden lg:flex gap-0.5 ml-5 pl-5 border-l border-[var(--line)] text-sm font-semibold text-[var(--ink-soft)] min-w-0 overflow-hidden">
          <Link href="/nha-dat-ban" className="navlink px-2.5 py-1.5 rounded-lg hover:text-brand whitespace-nowrap">Nhà đất bán</Link>
          <Link href="/nha-dat-cho-thue" className="navlink px-2.5 py-1.5 rounded-lg hover:text-brand whitespace-nowrap">Nhà đất cho thuê</Link>
          <Link href="/projects" className="navlink px-2.5 py-1.5 rounded-lg hover:text-brand whitespace-nowrap">Dự án</Link>
          <Link href="/agents" className="navlink px-2.5 py-1.5 rounded-lg hover:text-brand whitespace-nowrap">Người Bán</Link>
          <Link href="/thong-ke" className="navlink px-2.5 py-1.5 rounded-lg hover:text-brand whitespace-nowrap">Thống kê</Link>
          <Link href="/dinh-gia" className="navlink px-2.5 py-1.5 rounded-lg hover:text-brand whitespace-nowrap">Định Giá AI</Link>
          <Link href="/tinh-lai-vay" className="navlink px-2.5 py-1.5 rounded-lg hover:text-brand whitespace-nowrap">Lãi Vay</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2 shrink-0">
          <NavFav />
          <NavAuth />
        </div>
      </div>
    </header>
  );
}
