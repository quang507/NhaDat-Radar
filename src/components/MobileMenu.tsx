"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { HOTLINE, HOTLINE_ZALO } from "@/lib/hotline";
import {
  Menu, X, Home, KeyRound, Building2, Users, BarChart3,
  Newspaper, Sparkles, Calculator, Scale, Heart, Phone,
  MessageCircle, User, LogOut, UserPlus
} from "lucide-react";

const LINKS = [
  { href: "/search?deal=ban", label: "Mua Bán", icon: Home },
  { href: "/search?deal=cho_thue", label: "Cho Thuê", icon: KeyRound },
  { href: "/projects", label: "Dự án", icon: Building2 },
  { href: "/agents", label: "Người Bán", icon: Users },
  { href: "/thong-ke", label: "Thống kê", icon: BarChart3 },
  { href: "/tin-tuc", label: "Tin tức", icon: Newspaper },
  { href: "/dinh-gia", label: "Định Giá AI", icon: Sparkles, highlight: true },
  { href: "/tinh-lai-vay", label: "Lãi Vay", icon: Calculator },
  { href: "/thue-hay-mua", label: "Thuê hay Mua", icon: Scale },
  { href: "/yeu-thich", label: "Tin đã lưu", icon: Heart },
];

export default function MobileMenu() {
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => {
    const supabase = createClient();
    let huy = false;
    supabase.auth.getSession().then(({ data }) => { if (!huy) setLoggedIn(!!data.session); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setLoggedIn(!!s?.user));
    return () => { huy = true; sub.subscription.unsubscribe(); };
  }, []);
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        aria-label={open ? "Đóng menu" : "Mở menu"}
        className="btn !p-2 text-slate-700 hover:text-brand"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity" onClick={() => setOpen(false)} />
          <nav className="absolute left-0 right-0 top-full z-50 card border-t-0 shadow-2xl px-5 py-3 flex flex-col rounded-b-2xl animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-2 gap-1 py-1">
              {LINKS.map(({ href, label, icon: Icon, highlight }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors
                    ${highlight ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100" : "text-slate-700 hover:text-brand hover:bg-slate-50"}`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${highlight ? "text-emerald-600" : "text-slate-400"}`} />
                  <span>{label}</span>
                </Link>
              ))}
            </div>

            {/* Hotline & Zalo hỗ trợ */}
            <div className="pt-3 pb-2 mt-2 border-t border-[var(--line)]">
              <div className="text-[0.7rem] uppercase tracking-wider text-[var(--ink-faint)] font-bold mb-2">Hỗ trợ khách hàng:</div>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`tel:${HOTLINE}`}
                  className="btn btn-primary !py-2 text-center text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>{HOTLINE}</span>
                </a>
                <a
                  href={HOTLINE_ZALO}
                  target="_blank"
                  rel="noopener"
                  className="btn !py-2 text-center text-xs font-bold bg-[#0068ff] text-white border-0 flex items-center justify-center gap-1.5 hover:opacity-90"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Chat Zalo</span>
                </a>
              </div>
            </div>

            {/* Tài khoản */}
            <div className="pt-2 mt-1 border-t border-[var(--line)]">
              {loggedIn ? (
                <div className="flex items-center justify-between py-1">
                  <Link
                    href="/account"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-brand"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    <span>Tài khoản của tôi</span>
                  </Link>
                  <form action={signOut}>
                    <button type="submit" className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-red-600">
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Đăng xuất</span>
                    </button>
                  </form>
                </div>
              ) : (
                <Link
                  href="/auth?mode=register"
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-center gap-2 py-2 text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition text-center"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Đăng ký tài khoản miễn phí</span>
                </Link>
              )}
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
