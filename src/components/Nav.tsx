import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import NavFav from "./NavFav";
import NavMsg from "./NavMsg";
import MobileMenu from "./MobileMenu";

export default async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const initial = (user?.email || "?").charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--surface)]">
      <div className="relative max-w-6xl mx-auto px-5 py-3 flex items-center gap-3">
        <MobileMenu loggedIn={!!user} />
        <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight whitespace-nowrap min-w-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="NhaDat Radar" className="w-8 h-8 rounded-lg object-contain shrink-0" />
          {/* mobile <400px: chữ hiệu bị cắt "NhaDat Rac…" (UX audit 16/8) -> ẩn chữ, giữ logo */}
          <span className="hidden min-[420px]:inline">NhaDat&nbsp;<span className="text-brand">Radar</span></span>
        </Link>
        <nav className="hidden md:flex gap-0.5 ml-5 pl-5 border-l border-[var(--line)] text-sm font-semibold text-[var(--ink-soft)]">
          <Link href="/nha-dat-ban" className="navlink px-2.5 py-1.5 rounded-lg hover:text-brand whitespace-nowrap">Nhà đất bán</Link>
          <Link href="/nha-dat-cho-thue" className="navlink px-2.5 py-1.5 rounded-lg hover:text-brand whitespace-nowrap">Nhà đất cho thuê</Link>
          <Link href="/projects" className="navlink px-2.5 py-1.5 rounded-lg hover:text-brand whitespace-nowrap">Dự án</Link>
          <Link href="/agents" className="navlink px-2.5 py-1.5 rounded-lg hover:text-brand whitespace-nowrap">Người Bán</Link>
          <Link href="/thong-ke" className="navlink px-2.5 py-1.5 rounded-lg hover:text-brand whitespace-nowrap">Thống kê</Link>
          <Link href="/dinh-gia" className="navlink px-2.5 py-1.5 rounded-lg hover:text-brand whitespace-nowrap">Định Giá AI</Link>
          <Link href="/tinh-lai-vay" className="navlink px-2.5 py-1.5 rounded-lg hover:text-brand whitespace-nowrap">Lãi Vay</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <NavFav />
          {user ? (
            <>
              <NavMsg />
              <Link
                href="/account"
                title={user.email || ""}
                className="w-9 h-9 rounded-full grid place-items-center text-white text-sm font-bold bg-brand shrink-0"
              >
                {initial}
              </Link>
              <Link href="/dashboard/new" className="btn btn-primary whitespace-nowrap">
                + Đăng tin
              </Link>
              {/* mobile: Đăng xuất nằm trong menu ☰ / trang tài khoản, tránh tràn thanh nav */}
              <form action={signOut} className="hidden md:block">
                <button className="btn" type="submit">Đăng xuất</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/auth" className="btn whitespace-nowrap">Đăng nhập</Link>
              {/* mobile: 1 nút là đủ (form /auth có tab Đăng ký) — 2 nút làm tràn nav ở 390px */}
              <Link href="/auth?mode=register" className="btn btn-primary whitespace-nowrap hidden sm:inline-flex">Đăng ký</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
