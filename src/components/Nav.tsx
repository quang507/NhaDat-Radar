import Link from "next/link";
import NavFav from "./NavFav";
import NavAuth from "./NavAuth";
import MobileMenu from "./MobileMenu";
import LanguageSwitcher from "./LanguageSwitcher";


// Nav KHÔNG đọc cookie nữa (23/9): nó nằm trong layout gốc nên mỗi lần gọi auth.getUser() là ép
// toàn bộ site render động, không trang nào được cache. Trạng thái đăng nhập do NavAuth (client) lo.
export default function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--surface)]/95 backdrop-blur-md shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
      <div className="relative max-w-6xl mx-auto px-4 sm:px-5 py-2.5 flex items-center gap-3">
        <MobileMenu />
        <Link href="/" className="flex items-center gap-2.5 font-black text-base tracking-tight whitespace-nowrap shrink-0 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="NhaDat Radar" className="w-8 h-8 rounded-xl object-contain shrink-0 transition-transform duration-200 group-hover:scale-105" />
          <span className="hidden min-[420px]:inline text-slate-900 font-extrabold tracking-tight">NhaDat&nbsp;<span className="text-brand">Radar</span></span>
        </Link>

        {/* Menu ngang desktop */}
        <nav className="hidden lg:flex items-center gap-1 ml-4 pl-4 border-l border-[var(--line)] text-sm font-semibold text-slate-600 min-w-0">
          <Link href="/nha-dat-ban" className="px-2.5 py-1.5 rounded-lg hover:text-brand hover:bg-slate-50 transition-colors whitespace-nowrap">Nhà đất bán</Link>
          <Link href="/nha-dat-cho-thue" className="px-2.5 py-1.5 rounded-lg hover:text-brand hover:bg-slate-50 transition-colors whitespace-nowrap">Cho thuê</Link>
          <Link href="/projects" className="px-2.5 py-1.5 rounded-lg hover:text-brand hover:bg-slate-50 transition-colors whitespace-nowrap">Dự án</Link>
          <Link href="/agents" className="px-2.5 py-1.5 rounded-lg hover:text-brand hover:bg-slate-50 transition-colors whitespace-nowrap">Người Bán</Link>
          <Link href="/thong-ke" className="px-2.5 py-1.5 rounded-lg hover:text-brand hover:bg-slate-50 transition-colors whitespace-nowrap">Thống kê</Link>
          <Link href="/tin-tuc" className="px-2.5 py-1.5 rounded-lg hover:text-brand hover:bg-slate-50 transition-colors whitespace-nowrap">Tin tức</Link>
          <Link href="/dinh-gia" className="px-2.5 py-1.5 rounded-lg text-emerald-700 bg-emerald-50/80 hover:bg-emerald-100/80 transition-colors font-bold whitespace-nowrap">Định Giá AI</Link>
          <Link href="/tinh-lai-vay" className="px-2.5 py-1.5 rounded-lg hover:text-brand hover:bg-slate-50 transition-colors whitespace-nowrap">Lãi Vay</Link>
        </nav>

        <div className="ml-auto flex items-center gap-2 shrink-0">
          <LanguageSwitcher />
          <NavFav />
          <NavAuth />
        </div>
      </div>
    </header>
  );
}
