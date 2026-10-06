"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { HOTLINE, HOTLINE_ZALO } from "@/lib/hotline";

const LINKS: [string, string][] = [
  ["/search?deal=ban", "🏷 Mua Bán"],
  ["/search?deal=cho_thue", "🔑 Cho Thuê"],
  ["/projects", "🏙 Dự án"],
  ["/agents", "🧑‍💼 Người Bán"],
  ["/thong-ke", "📊 Thống kê"],
  ["/tin-tuc", "📰 Tin tức & giá thuê"],
  ["/dinh-gia", "🤖 Định Giá AI"],
  ["/tinh-lai-vay", "🧮 Lãi Vay"],
  ["/thue-hay-mua", "⚖️ Thuê hay Mua"],
  ["/yeu-thich", "♥ Tin đã lưu"],
];

// Menu ☰ cho mobile (nav ngang bị ẩn dưới md)
export default function MobileMenu() {
  // trước đây nhận prop loggedIn từ Nav (server, đọc cookie) -> ép cả site thành động (23/9)
  const [loggedIn, setLoggedIn] = useState(false);
  useEffect(() => {
    const supabase = createClient();
    let huy = false;
    supabase.auth.getSession().then(({ data }) => { if (!huy) setLoggedIn(!!data.session); });   // không gọi mạng (1/10)
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setLoggedIn(!!s?.user));
    return () => { huy = true; sub.subscription.unsubscribe(); };
  }, []);
  const [open, setOpen] = useState(false);
  return (
    <div className="lg:hidden">
      <button aria-label="Mở menu" className="btn !px-3" onClick={() => setOpen((v) => !v)}>
        {open ? "✕" : "☰"}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setOpen(false)} />
          <nav className="absolute left-0 right-0 top-full z-50 card border-t-0 shadow-xl px-5 py-3 flex flex-col">
            {LINKS.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="py-2.5 border-b border-[var(--line)] last:border-0 text-sm font-semibold hover:text-brand"
              >
                {label}
              </Link>
            ))}
            {/* Hotline & Zalo hỗ trợ nhanh */}
            <div className="py-3 border-b border-[var(--line)]">
              <div className="text-xs text-[var(--ink-soft)] font-medium mb-2">📞 Hotline &amp; Zalo hỗ trợ 24/7:</div>
              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`tel:${HOTLINE}`}
                  className="btn btn-primary !py-2 text-center text-xs font-bold"
                >
                  📞 {HOTLINE}
                </a>
                <a
                  href={HOTLINE_ZALO}
                  target="_blank"
                  rel="noopener"
                  className="btn !py-2 text-center text-xs font-bold bg-[#0068ff] text-white border-0"
                >
                  💬 Chat Zalo
                </a>
              </div>
            </div>

            {/* Tài khoản: nav mobile đã ẩn nút Đăng ký/Đăng xuất để không tràn -> đưa vào đây */}
            {loggedIn ? (
              <>
                <Link href="/account" onClick={() => setOpen(false)} className="py-2.5 border-b border-[var(--line)] text-sm font-semibold hover:text-brand">👤 Tài khoản</Link>
                <form action={signOut}><button type="submit" className="py-2.5 text-sm font-semibold text-[var(--ink-soft)] hover:text-brand">Đăng xuất</button></form>
              </>
            ) : (
              <Link href="/auth?mode=register" onClick={() => setOpen(false)} className="py-2.5 text-sm font-semibold text-brand">Đăng ký tài khoản</Link>
            )}
          </nav>
        </>
      )}
    </div>
  );
}
