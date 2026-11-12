"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { HOTLINE, HOTLINE_DISPLAY, HOTLINE_ZALO } from "@/lib/hotline";
import { useDongBangBack } from "@/lib/dong-bang-back";
import { LinkTheoDoi, NutZalo } from "./TheoDoi";
import { Sparkles, X, PhoneCall, MessageCircle } from "lucide-react";

// 2/11 (audit P3): khung chat AI chỉ tải khi khách bấm mở - thanh Gọi/Zalo/AI vẫn render SSR
const ChatPanel = dynamic(() => import("./ChatPanel"), { ssr: false });

// Cụm liên hệ nhanh nổi góc phải: Zalo + Gọi điện + Hỏi trợ lý
export default function ChatWidget() {
  const pathname = usePathname();
  // đang ở trang chi tiết tin -> gửi kèm id để bot hiểu
  const dangXem = pathname?.match(/^\/listings\/([0-9a-f-]{36})/i)?.[1] || null;
  // Chỉ giữ thanh Gọi/Zalo đáy trên trang chi tiết tin (do PhoneReveal render riêng);
  // các trang tìm kiếm/trang chủ/nội dung dùng nút nổi gọn "Hỏi AI" góc phải để khỏi choán 64px chiều cao màn đầu.
  const anNutNoi = pathname === "/lap-phong" || pathname === "/auth" || pathname?.startsWith("/admin") || pathname?.startsWith("/dashboard");

  const [open, setOpen] = useState(false);
  // đã mở lần nào chưa: mở rồi thì giữ ChatPanel trong cây (ẩn khi đóng) để không mất lịch sử
  const [daMo, setDaMo] = useState(false);
  useEffect(() => { if (open) setDaMo(true); }, [open]);
  // 2/11 (audit M4): nút Back Android đóng khung chat thay vì rời trang
  useDongBangBack(open, () => setOpen(false));
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hoverOpenAtRef = useRef(0);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (!menuOpen) hoverOpenAtRef.current = Date.now();
    setMenuOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setMenuOpen(false);
    }, 250);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* MOBILE: chỉ hiện nút nổi "Hỏi AI" gọn gàng ở góc phải; trên trang chi tiết tin thì nhường chỗ phía trên thanh Gọi/Zalo */}
      {!anNutNoi && (
        <button
          type="button"
          aria-label={open ? "Đóng trợ lý AI" : dangXem ? "Hỏi nhanh AI về phòng này" : "Mở trợ lý AI tìm phòng"}
          onClick={() => setOpen((v) => !v)}
          className={`lg:hidden fixed right-3 z-30 min-h-11 px-3.5 rounded-full bg-[var(--ink)] text-[var(--bg)] shadow-lg border border-white/15 flex items-center gap-1.5 text-xs font-bold active:scale-95 transition cursor-pointer ${
            dangXem
              ? "bottom-[calc(5.25rem+env(safe-area-inset-bottom))]"
              : "bottom-[calc(1rem+env(safe-area-inset-bottom))]"
          }`}
        >
          {open ? <X className="w-4 h-4" /> : <><Sparkles className="w-3.5 h-3.5 text-amber-400" /><span>Hỏi AI</span></>}
        </button>
      )}

      {/* Máy tính: Gộp 3 nút thành 1 nút nổi duy nhất (Speed Dial) ở góc phải.
          Rê chuột (hover) hoặc bấm vào để bung mở menu dọc mượt mà kèm animation. */}
      <div
        ref={menuRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="fixed bottom-6 right-6 z-40 hidden lg:flex flex-col items-end py-1 pl-6"
      >
        {/* Menu mở rộng dạng Speed Dial với animation trượt mượt */}
        <div
          aria-hidden={!menuOpen}
          className={`flex flex-col items-end gap-2.5 mb-3 transition-all duration-300 ease-out origin-bottom-right ${
            menuOpen
              ? "opacity-100 translate-y-0 scale-100 pointer-events-auto visible"
              : "opacity-0 translate-y-3 scale-95 pointer-events-none invisible"
          }`}
        >
          {/* 1. Gọi Hotline - 2/11 (audit Q6): ghi ndr_goi */}
          <LinkTheoDoi
            loai="goi"
            href={`tel:${HOTLINE}`}
            aria-label={`Gọi Hotline ${HOTLINE}`}
            title="Gọi Hotline tư vấn nhanh"
            onClick={() => setMenuOpen(false)}
            className={`flex items-center gap-2 group transition-all duration-300 ease-out transform ${
              menuOpen ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            } hover:scale-105 active:scale-95`}
          >
            <span className="px-3 py-1.5 rounded-lg bg-[var(--surface)] text-[var(--ink)] text-xs font-bold shadow-md border border-[var(--line)] group-hover:border-emerald-500 group-hover:text-emerald-600 transition-colors">
              Hotline: {HOTLINE_DISPLAY}
            </span>
            <div className="w-10 h-10 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white flex items-center justify-center shadow-md border border-emerald-600 transition-colors">
              <PhoneCall className="w-4 h-4" />
            </div>
          </LinkTheoDoi>

          {/* 2. Nhắn Zalo (Icon Zalo chuẩn) - 2/11 (audit Q6): ghi ndr_zalo + chép sẵn tin nhắn */}
          <NutZalo
            tinNhan="Chào Radar, mình cần tư vấn tìm phòng"
            href={HOTLINE_ZALO}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Nhắn Zalo tư vấn (8:00 - 21:00)"
            title="Nhắn Zalo tư vấn (8:00 - 21:00)"
            onClick={() => setMenuOpen(false)}
            className={`flex items-center gap-2 group transition-all duration-300 ease-out transform ${
              menuOpen ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            } hover:scale-105 active:scale-95`}
          >
            <span className="px-3 py-1.5 rounded-lg bg-[var(--surface)] text-[var(--ink)] text-xs font-bold shadow-md border border-[var(--line)] group-hover:border-blue-500 group-hover:text-blue-600 transition-colors">
              Nhắn Zalo tư vấn (8:00 - 21:00)
            </span>
            <div className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-md border border-blue-500 transition-colors">
              <IconZalo className="w-6 h-6" />
            </div>
          </NutZalo>

          {/* 3. Hỏi Trợ lý AI */}
          <button
            type="button"
            aria-label="Mở Trợ lý AI tìm phòng"
            title="Hỏi trợ lý AI tìm phòng"
            onClick={() => {
              setMenuOpen(false);
              setOpen(true);
            }}
            className={`flex items-center gap-2 group transition-all duration-300 ease-out transform ${
              menuOpen ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            } hover:scale-105 active:scale-95 cursor-pointer`}
          >
            <span className="px-3 py-1.5 rounded-lg bg-[var(--surface)] text-[var(--ink)] text-xs font-bold shadow-md border border-[var(--line)] group-hover:border-brand group-hover:text-brand transition-colors">
              Hỏi Trợ lý AI tìm phòng
            </span>
            <div className="w-10 h-10 rounded-full bg-[var(--ink)] hover:bg-[var(--ink)]/90 text-[var(--bg)] flex items-center justify-center shadow-md border border-[var(--ink)] transition-colors">
              <Sparkles className="w-4 h-4 text-amber-400" />
            </div>
          </button>
        </div>

        {/* Nút bấm tròn chính (FAB) */}
        <button
          type="button"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Đóng menu hỗ trợ" : "Mở menu hỗ trợ & liên hệ"}
          title={menuOpen ? "Đóng menu hỗ trợ" : "Hỗ trợ & Trợ lý tìm nhà"}
          onClick={() => {
            if (open) {
              setOpen(false);
            } else if (Date.now() - hoverOpenAtRef.current < 400) {
              setMenuOpen(true);
            } else {
              setMenuOpen((v) => !v);
            }
          }}
          className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95 cursor-pointer border ${
            menuOpen || open
              ? "bg-[var(--ink)] border-[var(--ink)] text-[var(--bg)]"
              : "bg-brand hover:bg-brand-ink border-emerald-600 shadow-emerald-500/20"
          }`}
        >
          <div className={`transition-transform duration-300 ease-out ${menuOpen || open ? "rotate-90 scale-105" : "rotate-0 scale-100"}`}>
            {menuOpen || open ? (
              <X className="w-5 h-5" />
            ) : (
              <MessageCircle className="w-5 h-5 fill-current" />
            )}
          </div>
        </button>
      </div>

      {/* 2/11 (audit P3): khung chat tải riêng khi mở lần đầu, sau đó chỉ ẩn/hiện để giữ lịch sử */}
      {daMo && <ChatPanel open={open} dangXem={dangXem} onClose={() => setOpen(false)} />}
    </>
  );
}

function IconZalo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path
        d="M18 3.5C9.99 3.5 3.5 9.54 3.5 17c0 4.25 2.15 8.05 5.52 10.62-.29 2.19-1.16 5.08-1.26 5.43-.17.58.35 1.05.85.76 2.71-1.57 5.55-3.25 6.35-3.76.97.25 2 .39 3.04.39 8.01 0 14.5-6.04 14.5-13.44C32.5 9.54 26.01 3.5 18 3.5z"
        fill="white"
      />
      <text
        x="18"
        y="18.5"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#0068ff"
        fontSize="10"
        fontWeight="900"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        letterSpacing="-0.4px"
      >
        Zalo
      </text>
    </svg>
  );
}
