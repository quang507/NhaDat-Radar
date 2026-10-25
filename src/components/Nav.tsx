import Link from "next/link";
import NavFav from "./NavFav";
import NavAuth from "./NavAuth";
import MobileMenu from "./MobileMenu";
import ThemeToggle from "./ThemeToggle";

// Nav KHÔNG đọc cookie nữa (23/9): nó nằm trong layout gốc nên mỗi lần gọi auth.getUser() là ép
// toàn bộ site render động, không trang nào được cache. Trạng thái đăng nhập do NavAuth (client) lo.
export default function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--surface)]/95 backdrop-blur-md shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-5 py-2.5 flex items-center gap-3">
        <MobileMenu />
        <Link href="/" className="flex items-center gap-2.5 font-black text-base tracking-tight whitespace-nowrap shrink-0 group">
          {/* Logo R mới (25/10): 2 bản màu phẳng theo theme - logo.svg cho nền sáng, logo-dark.svg (emerald sáng hơn) cho nền slate.
              Chữ thương hiệu là chữ HTML Inter: file Illustrator gốc dùng FranklinGothic không nhúng -> trình duyệt hiện Times. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="NhaDat Radar" width={25} height={32} className="h-8 w-auto shrink-0 dark:hidden" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-dark.svg" alt="" aria-hidden width={25} height={32} className="h-8 w-auto shrink-0 hidden dark:block" />
          <span className="hidden min-[480px]:inline text-[var(--ink)] font-extrabold tracking-tight uppercase">NhaDat&nbsp;<span className="text-brand">Radar</span></span>
        </Link>

        {/* Menu ngang desktop */}
        {/* 8 link + cụm nút đã đăng nhập không vừa 1152px (tràn đè lên nhau) -> header rộng 7xl, menu ngang chỉ từ xl */}
        <nav className="hidden xl:flex items-center gap-0.5 ml-3 pl-3 border-l border-[var(--line)] text-sm font-semibold text-slate-600 dark:text-slate-300 min-w-0">
          <Link href="/nha-dat-ban" className="px-2 py-1.5 rounded-md hover:text-brand hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors whitespace-nowrap">Nhà đất bán</Link>
          <Link href="/nha-dat-cho-thue" className="px-2 py-1.5 rounded-md hover:text-brand hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors whitespace-nowrap">Cho thuê</Link>
          <Link href="/projects" className="px-2 py-1.5 rounded-md hover:text-brand hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors whitespace-nowrap">Dự án</Link>
          <Link href="/agents" className="px-2 py-1.5 rounded-md hover:text-brand hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors whitespace-nowrap">Người Bán</Link>
          <Link href="/thong-ke" className="px-2 py-1.5 rounded-md hover:text-brand hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors whitespace-nowrap">Thống kê</Link>
          <Link href="/tin-tuc" className="px-2 py-1.5 rounded-md hover:text-brand hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors whitespace-nowrap">Tin tức</Link>
          <Link href="/dinh-gia" className="px-2 py-1.5 rounded-md text-emerald-700 bg-emerald-50/80 dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-emerald-100/80 transition-colors font-bold whitespace-nowrap">Định Giá AI</Link>
          <Link href="/tinh-lai-vay" className="px-2 py-1.5 rounded-md hover:text-brand hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors whitespace-nowrap">Lãi Vay</Link>
        </nav>

        <div className="ml-auto flex items-center gap-2 shrink-0">
          {/* điện thoại: nút sáng/tối nằm trong menu ☰ (MobileMenu) cho header gọn */}
          <span className="hidden sm:contents"><ThemeToggle /></span>
          <NavFav />
          <NavAuth />
        </div>
      </div>
    </header>
  );
}
