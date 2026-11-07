"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { HOTLINE, HOTLINE_ZALO } from "@/lib/hotline";
import { usePhien } from "@/lib/supabase/lazy";
import { useDongBangBack } from "@/lib/dong-bang-back";
import { LinkTheoDoi } from "./TheoDoi";
import ThemeToggle from "./ThemeToggle";
import {
  Menu, X, Home, KeyRound, Building2, Users, BarChart3,
  Newspaper, Sparkles, Calculator, Scale, Heart, Phone,
  MessageCircle, User, LogOut, UserPlus
} from "lucide-react";

const LINKS = [
  { href: "/nha-dat-ban", label: "Mua Bán", icon: Home },
  { href: "/nha-dat-cho-thue", label: "Cho Thuê", icon: KeyRound },
  { href: "/projects", label: "Dự án", icon: Building2 },
  { href: "/agents", label: "Người Bán", icon: Users },
  { href: "/thong-ke", label: "Thống kê", icon: BarChart3 },
  { href: "/tin-tuc", label: "Tin tức", icon: Newspaper },
  { href: "/dinh-gia", label: "Định Giá AI", icon: Sparkles, highlight: true },
  { href: "/tinh-lai-vay", label: "Lãi Vay", icon: Calculator },
  { href: "/thue-hay-mua", label: "Thuê hay Mua", icon: Scale },
  { href: "/yeu-thich", label: "Tin đã lưu", icon: Heart },
  { href: "/lap-phong", label: "Cho chủ trọ: lấp phòng", icon: KeyRound },
];

export default function MobileMenu() {
  // 2/11 (audit P1): trạng thái đăng nhập qua usePhien - khách không cookie thì không tải supabase-js
  const loggedIn = !!usePhien().uid;
  const [open, setOpen] = useState(false);
  // 2/11 (audit M4): nút Back Android đóng menu thay vì rời trang
  useDongBangBack(open, () => setOpen(false));
  // Bấm link trong menu: KHÔNG để hook gọi history.back() - back() đua với router.push, popstate về trang cũ
  // làm Next huỷ điều hướng đang chạy. Gỡ cờ lopPhu rồi mới đóng (đổi lại: thừa 1 mục lịch sử cùng trang).
  const dongDeDi = () => {
    try {
      const s = window.history.state;
      if (s?.lopPhu) window.history.replaceState({ ...s, lopPhu: false }, "");
    } catch { /* bỏ qua */ }
    setOpen(false);
  };
  // đổi trang bằng đường khác (đăng xuất -> redirect) cũng đóng menu
  const path = usePathname();
  useEffect(() => { setOpen(false); }, [path]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="xl:hidden">
      <button
        type="button"
        aria-label={open ? "Đóng menu" : "Mở menu"}
        aria-expanded={open}
        className="btn !p-2 min-h-11 min-w-11 text-[var(--ink-soft)] hover:text-brand"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 transition-opacity" onClick={() => setOpen(false)} />
          {/* 2/11 (audit M2): xoay ngang / màn thấp vẫn cuộn được trong menu, không cuộn trang phía sau */}
          <nav className="absolute left-0 right-0 top-full z-50 card border-t-0 shadow-lg px-4 py-3 flex flex-col rounded-b-sm max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-2 gap-1 py-1">
              {LINKS.map(({ href, label, icon: Icon, highlight }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={dongDeDi}
                  className={`flex items-center gap-2.5 min-h-11 px-3 py-2 rounded-sm text-sm font-semibold transition-colors
                    ${highlight ? "text-brand bg-brand/10 hover:bg-brand/15" : "text-[var(--ink)] hover:text-brand hover:bg-[var(--surface-2)]"}`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${highlight ? "text-brand" : "text-[var(--ink-faint)]"}`} />
                  <span>{label}</span>
                </Link>
              ))}
            </div>

            {/* Nút Đăng tin nổi bật trên Mobile */}
            <div className="pt-2">
              <Link
                href="/dashboard/new"
                onClick={dongDeDi}
                className="w-full btn btn-primary min-h-11 flex items-center justify-center gap-2 font-bold py-2.5 rounded-sm shadow-xs text-sm"
              >
                <span>+ Đăng tin nhà đất miễn phí</span>
              </Link>
            </div>

            {/* Hotline & Zalo hỗ trợ - 2/11 (audit Q6): bắn ndr_goi / ndr_zalo như nút ở trang tin */}
            <div className="pt-3 pb-2 mt-2 border-t border-[var(--line)]">
              <div className="text-overline uppercase tracking-wider text-[var(--ink-faint)] font-bold mb-2">Hỗ trợ khách hàng:</div>
              <div className="grid grid-cols-2 gap-2">
                <LinkTheoDoi
                  loai="goi"
                  href={`tel:${HOTLINE}`}
                  className="btn btn-primary min-h-11 !py-2 text-center text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{HOTLINE}</span>
                </LinkTheoDoi>
                <LinkTheoDoi
                  loai="zalo"
                  href={HOTLINE_ZALO}
                  target="_blank"
                  rel="noopener"
                  className="btn btn-zalo min-h-11 !py-2 text-center text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Chat Zalo</span>
                </LinkTheoDoi>
              </div>
            </div>

            {/* Tài khoản */}
            <div className="pt-2 mt-1 border-t border-[var(--line)]">
              {loggedIn ? (
                <div className="flex items-center justify-between py-1">
                  <Link
                    href="/account"
                    onClick={dongDeDi}
                    className="flex items-center gap-2 min-h-11 text-sm font-semibold text-[var(--ink)] hover:text-brand"
                  >
                    <User className="w-4 h-4 text-[var(--ink-faint)]" />
                    <span>Tài khoản của tôi</span>
                  </Link>
                  <form action={signOut}>
                    <button type="submit" className="flex items-center gap-1 min-h-11 px-2 text-xs font-semibold text-[var(--ink-soft)] hover:text-red-600">
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Đăng xuất</span>
                    </button>
                  </form>
                </div>
              ) : (
                <Link
                  href="/auth?mode=register"
                  onClick={dongDeDi}
                  className="flex items-center justify-center gap-2 min-h-11 py-2 text-sm font-bold text-brand bg-brand/10 hover:bg-brand/15 rounded-sm transition text-center"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Đăng ký tài khoản miễn phí</span>
                </Link>
              )}
            </div>
            {/* nút giao diện sáng/tối: ở header bị ẩn trên điện thoại (25/10, header 6 nút quá chật ở 375px) */}
            <div className="sm:hidden pt-2 mt-2 border-t border-[var(--line)] flex items-center justify-between text-sm font-semibold text-[var(--ink-soft)]">
              <span>Giao diện sáng / tối</span>
              <ThemeToggle />
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
