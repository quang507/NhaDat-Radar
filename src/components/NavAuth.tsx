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
import { LogOut, Plus, User } from "lucide-react";
import { usePhien } from "@/lib/supabase/lazy";
import { PHONE_QUICK_DOMAIN, tenHienThiTaiKhoan } from "@/lib/hotline";
import NavMsg from "./NavMsg";
import NutDangXuat from "./NutDangXuat";

// 21/11: nút chính của thanh nav (đặc, nền thương hiệu); "Đăng nhập" bên cạnh giữ kiểu phụ để có thứ bậc rõ.
// Mobile chỉ còn dấu "+" (đủ chữ thì cụm nút tràn mép phải ở 360-390px), vẫn rộng 44px.
const NUT_DANG_TIN = "btn btn-primary whitespace-nowrap min-w-11 !min-h-11 px-3 sm:px-4";
const DangTin = () => (
  <Link href="/dashboard/new" aria-label="Đăng tin" className={NUT_DANG_TIN}>
    <Plus className="w-4 h-4" aria-hidden />
    <span className="hidden sm:inline">Đăng tin</span>
  </Link>
);

export default function NavAuth() {
  // 2/11 (audit P1): không có cookie phiên thì không tải supabase-js; có thì tải động + nghe onAuthStateChange
  const { uid, email } = usePhien();

  // chưa biết trạng thái / chưa đăng nhập: hiện khung chuẩn bị để khỏi giật layout
  if (!email) {
    return (
      <>
        <Link href="/auth" className="btn whitespace-nowrap">Đăng nhập</Link>
        <DangTin />
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
      <DangTin />
      {/* mobile: Đăng xuất nằm trong menu ☰ / trang tài khoản, tránh tràn thanh nav */}
      {/* desktop: chỉ icon (kèm title) - nút chữ "Đăng xuất" làm menu ngang bị đè */}
      <NutDangXuat
        title="Đăng xuất"
        className="hidden xl:grid w-11 h-11 rounded-full place-items-center text-[var(--ink-soft)] hover:text-brand hover:bg-[var(--surface-2)] transition-colors"
      >
        <LogOut className="w-4 h-4" />
      </NutDangXuat>
    </>
  );
}
