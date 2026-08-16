"use client";

import { useState } from "react";
import Link from "next/link";
import { signOut } from "@/app/auth/actions";

const LINKS: [string, string][] = [
  ["/search?deal=ban", "🏷 Mua Bán"],
  ["/search?deal=cho_thue", "🔑 Cho Thuê"],
  ["/projects", "🏙 Dự án"],
  ["/agents", "🧑‍💼 Người Bán"],
  ["/thong-ke", "📊 Thống kê"],
  ["/dinh-gia", "🤖 Định Giá AI"],
  ["/tinh-lai-vay", "🧮 Lãi Vay"],
  ["/thue-hay-mua", "⚖️ Thuê hay Mua"],
  ["/yeu-thich", "♥ Tin đã lưu"],
];

// Menu ☰ cho mobile (nav ngang bị ẩn dưới md)
export default function MobileMenu({ loggedIn = false }: { loggedIn?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
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
