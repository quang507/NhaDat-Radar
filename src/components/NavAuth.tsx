"use client";

// Cụm đăng nhập/đăng xuất trên thanh nav - TÁCH RA CLIENT (23/9).
//
// Vì sao: Nav là server component và gọi auth.getUser() (đọc cookie), mà Nav nằm trong layout gốc
// -> MỌI trang, kể cả trang SEO khu vực, đều bị Next coi là động và không bao giờ được cache
// (đo: mọi phản hồi đều "Cache-Control: private, no-store", x-vercel-cache MISS). Đọc cookie ở
// client thay vì server để layout sạch cookie, nhờ đó trang khu vực bật được ISR.
// Đánh đổi: người ĐÃ đăng nhập thấy nút "Đăng nhập" trong khoảng vài trăm ms đầu rồi mới đổi thành
// avatar. Khách vãng lai và Google thì thấy đúng ngay từ HTML đầu tiên.
import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/app/auth/actions";
import NavMsg from "./NavMsg";

export default function NavAuth() {
  const [email, setEmail] = useState<string | null>(null);
  const [xong, setXong] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let huy = false;
    supabase.auth.getUser().then(({ data }) => {
      if (huy) return;
      setEmail(data.user?.email ?? null);
      setXong(true);
    });
    // đăng nhập/đăng xuất ở tab khác -> nav tự cập nhật, không cần tải lại trang
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => setEmail(session?.user?.email ?? null));
    return () => { huy = true; sub.subscription.unsubscribe(); };
  }, []);

  if (!xong && !email) {
    // chưa biết trạng thái: hiện đúng thứ khách vãng lai thấy (đa số lượt truy cập) để khỏi giật layout
    return (
      <>
        <Link href="/auth" className="btn whitespace-nowrap">Đăng nhập</Link>
        <Link href="/auth?mode=register" className="btn btn-primary whitespace-nowrap hidden sm:inline-flex">Đăng ký</Link>
      </>
    );
  }

  if (!email) {
    return (
      <>
        <Link href="/auth" className="btn whitespace-nowrap">Đăng nhập</Link>
        {/* mobile: 1 nút là đủ (form /auth có tab Đăng ký) - 2 nút làm tràn nav ở 390px */}
        <Link href="/auth?mode=register" className="btn btn-primary whitespace-nowrap hidden sm:inline-flex">Đăng ký</Link>
      </>
    );
  }

  return (
    <>
      <NavMsg />
      <Link
        href="/account"
        title={email}
        className="w-9 h-9 rounded-full grid place-items-center text-white text-sm font-bold bg-brand shrink-0"
      >
        {email.charAt(0).toUpperCase()}
      </Link>
      <Link href="/dashboard/new" className="btn btn-primary whitespace-nowrap">+ Đăng tin</Link>
      {/* mobile: Đăng xuất nằm trong menu ☰ / trang tài khoản, tránh tràn thanh nav */}
      <form action={signOut} className="hidden lg:block">
        <button className="btn" type="submit">Đăng xuất</button>
      </form>
    </>
  );
}
