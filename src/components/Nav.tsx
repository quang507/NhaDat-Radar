import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import NavFav from "./NavFav";

export default async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const initial = (user?.email || "?").charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--surface)]/85 backdrop-blur">
      <div className="max-w-6xl mx-auto px-5 py-3 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight whitespace-nowrap">
          <span className="w-7 h-7 rounded-lg grid place-items-center text-white text-sm bg-gradient-to-br from-brand to-brand-2">
            ◎
          </span>
          NhaDat<span className="text-brand">Radar</span>
        </Link>
        <nav className="hidden md:flex gap-0.5 ml-1 text-sm font-semibold text-[var(--ink-soft)]">
          <Link href="/search?deal=ban" className="px-2.5 py-1.5 rounded-lg hover:text-brand whitespace-nowrap">Mua Bán</Link>
          <Link href="/search?deal=cho_thue" className="px-2.5 py-1.5 rounded-lg hover:text-brand whitespace-nowrap">Cho Thuê</Link>
          <Link href="/projects" className="px-2.5 py-1.5 rounded-lg hover:text-brand whitespace-nowrap">Dự án</Link>
          <Link href="/agents" className="px-2.5 py-1.5 rounded-lg hover:text-brand whitespace-nowrap">Người Bán</Link>
          <Link href="/thong-ke" className="px-2.5 py-1.5 rounded-lg hover:text-brand whitespace-nowrap">Thống kê</Link>
          <Link href="/dinh-gia" className="px-2.5 py-1.5 rounded-lg hover:text-brand whitespace-nowrap">Định Giá AI</Link>
          <Link href="/tinh-lai-vay" className="px-2.5 py-1.5 rounded-lg hover:text-brand whitespace-nowrap">Lãi Vay</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <NavFav />
          {user ? (
            <>
              <Link
                href="/dashboard"
                title={user.email || ""}
                className="w-9 h-9 rounded-full grid place-items-center text-white text-sm font-bold bg-gradient-to-br from-brand to-brand-2 shrink-0"
              >
                {initial}
              </Link>
              <Link href="/dashboard/new" className="btn btn-primary">
                + Đăng tin
              </Link>
              <form action={signOut}>
                <button className="btn" type="submit">Đăng xuất</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/auth" className="btn">Đăng nhập</Link>
              <Link href="/auth?mode=register" className="btn btn-primary">Đăng ký</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
