import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/auth/actions";
import NavFav from "./NavFav";

export default async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--surface)]/85 backdrop-blur">
      <div className="max-w-6xl mx-auto px-5 py-3 flex items-center gap-5">
        <Link href="/" className="flex items-center gap-2 font-extrabold tracking-tight">
          <span className="w-7 h-7 rounded-lg grid place-items-center text-white text-sm bg-gradient-to-br from-brand to-brand-2">
            ◎
          </span>
          NhaDat<span className="text-brand">Radar</span>
        </Link>
        <nav className="hidden md:flex gap-1 ml-2 text-sm font-semibold text-[var(--ink-soft)]">
          <Link href="/search?deal=ban" className="px-3 py-1.5 rounded-lg hover:text-brand">Mua Bán</Link>
          <Link href="/search?deal=cho_thue" className="px-3 py-1.5 rounded-lg hover:text-brand">Cho Thuê</Link>
          <Link href="/projects" className="px-3 py-1.5 rounded-lg hover:text-brand">Dự án</Link>
          <Link href="/agents" className="px-3 py-1.5 rounded-lg hover:text-brand">Người Bán</Link>
          <Link href="/thong-ke" className="px-3 py-1.5 rounded-lg hover:text-brand">Thống kê</Link>
          <Link href="/tinh-lai-vay" className="px-3 py-1.5 rounded-lg hover:text-brand">Lãi Vay</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <NavFav />
          {user ? (
            <>
              <span className="text-sm text-[var(--ink-soft)] hidden sm:inline">
                👤 {user.email}
              </span>
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
