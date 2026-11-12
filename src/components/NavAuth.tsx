"use client";

// Cụm đăng nhập/đăng xuất trên thanh nav - TÁCH RA CLIENT (23/9).
//
// Vì sao: Nav là server component và gọi auth.getUser() (đọc cookie), mà Nav nằm trong layout gốc
// -> MỌI trang, kể cả trang SEO khu vực, đều bị Next coi là động và không bao giờ được cache
// (đo: mọi phản hồi đều "Cache-Control: private, no-store", x-vercel-cache MISS). Đọc cookie ở
// client thay vì server để layout sạch cookie, nhờ đó trang khu vực bật được ISR.
// Đánh đổi: người ĐÃ đăng nhập thấy nút "Đăng nhập" trong khoảng vài trăm ms đầu rồi mới đổi thành
// avatar. Khách vãng lai và Google thì thấy đúng ngay từ HTML đầu tiên.
import Link from "next/link";
import { LogOut, User } from "lucide-react";
import { usePhien } from "@/lib/supabase/lazy";
import { signOut } from "@/app/auth/actions";
import { PHONE_QUICK_DOMAIN, tenHienThiTaiKhoan } from "@/lib/hotline";
import NavMsg from "./NavMsg";

export default function NavAuth() {
  // 2/11 (audit P1): không có cookie phiên thì không tải supabase-js; có thì tải động + nghe onAuthStateChange
  const { xong, uid, email } = usePhien();

  if (!xong && !email) {
    // chưa biết trạng thái: hiện khung chuẩn bị để khỏi giật layout
    return (
      <>
        <Link href="/auth" className="btn whitespace-nowrap">Đăng nhập</Link>
        <Link href="/dashboard/new" aria-label="Đăng tin" className="btn border border-brand text-brand hover:bg-brand hover:text-white transition-colors font-semibold whitespace-nowrap">
          +<span className="hidden sm:inline">&nbsp;Đăng tin</span>
        </Link>
      </>
    );
  }

  if (!email) {
    return (
      <>
        <Link href="/auth" className="btn whitespace-nowrap">Đăng nhập</Link>
        <Link href="/dashboard/new" aria-label="Đăng tin" className="btn border border-brand text-brand hover:bg-brand hover:text-white transition-colors font-semibold whitespace-nowrap">
          +<span className="hidden sm:inline">&nbsp;Đăng tin</span>
        </Link>
      </>
    );
  }

  const nhanHienThi = tenHienThiTaiKhoan(email);
  const laTaiKhoanSdt = email.toLowerCase().endsWith(`@${PHONE_QUICK_DOMAIN}`);

  return (
    <>
      {uid && <NavMsg uid={uid} />}
      {/* 2/11 (audit M1): vùng chạm 44px, vòng avatar vẫn 36px */}
      <Link
        href="/account"
        title={nhanHienThi}
        aria-label="Tài khoản của tôi"
        className="w-11 h-11 grid place-items-center shrink-0"
      >
        <span className="w-9 h-9 rounded-full grid place-items-center text-white text-sm font-bold bg-brand">
          {laTaiKhoanSdt ? <User className="w-4 h-4" /> : nhanHienThi.charAt(0).toUpperCase()}
        </span>
      </Link>
      {/* mobile: chỉ dấu "+" - đủ chữ thì cụm nút tràn mép phải ở 360-390px */}
      <Link href="/dashboard/new" aria-label="Đăng tin" className="btn border border-brand text-brand hover:bg-brand hover:text-white transition-colors font-semibold whitespace-nowrap">
        +<span className="hidden sm:inline">&nbsp;Đăng tin</span>
      </Link>
      {/* mobile: Đăng xuất nằm trong menu ☰ / trang tài khoản, tránh tràn thanh nav */}
      {/* desktop: chỉ icon (kèm title) - nút chữ "Đăng xuất" làm menu ngang bị đè */}
      <form action={signOut} className="hidden xl:block">
        <button
          className="w-11 h-11 rounded-full grid place-items-center text-[var(--ink-soft)] hover:text-brand hover:bg-[var(--surface-2)] transition-colors"
          type="submit"
          title="Đăng xuất"
          aria-label="Đăng xuất"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </form>
    </>
  );
}
