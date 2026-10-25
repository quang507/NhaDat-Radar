"use client";

import { useEffect, useState, type ReactNode } from "react";

// Header "bán dính" trên điện thoại (25/10, NN/g "Sticky Headers: 5 Ways to Make Them Better"): cuộn XUỐNG
// đọc tin -> header trượt đi, trả 56px cho nội dung; cuộn LÊN một chút -> hiện lại ngay để điều hướng.
// Máy tính (>=1024px) giữ header dính như cũ. Đặt cờ data-header-an trên <html> để các thanh dính
// bên dưới (MobileSectionJumper...) trượt lên theo - xem .duoi-header trong globals.css.
export default function HeaderCuon({ className = "", children }: { className?: string; children: ReactNode }) {
  const [an, setAn] = useState(false);

  useEffect(() => {
    const dienThoai = window.matchMedia("(max-width: 1023px)");
    let truoc = window.scrollY, choKhung = false;
    const onScroll = () => {
      if (choKhung) return;
      choKhung = true;
      requestAnimationFrame(() => {
        const y = window.scrollY, d = y - truoc;
        if (!dienThoai.matches || y < 80) setAn(false);       // gần đầu trang: luôn hiện
        else if (d > 8) setAn(true);                           // ngưỡng 8px: bỏ qua rung tay
        else if (d < -8) setAn(false);
        if (Math.abs(d) > 8) truoc = y;
        choKhung = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.documentElement.toggleAttribute("data-header-an", an);
  }, [an]);

  return (
    <header
      className={`${className} transition-transform duration-200 ease-out motion-reduce:transition-none ${an ? "header-an" : ""}`}
      onFocusCapture={() => setAn(false)}
    >
      {children}
    </header>
  );
}
