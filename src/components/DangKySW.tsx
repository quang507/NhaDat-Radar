"use client";

import { useEffect } from "react";

// 2/11 (audit 🔴8): đăng ký SW sau khi trang tải xong - không tranh băng thông với LCP. Chỉ bản production.
// sw.js chỉ trả /offline.html khi rớt mạng, KHÔNG cache HTML -> ISR/CDN giữ nguyên.
// 5/11: bỏ banner mời cài app (anh Quang). Chặn luôn thanh "Cài đặt ứng dụng" tự hiện của Chrome Android.
export default function DangKySW() {
  useEffect(() => {
    const chan = (e: Event) => e.preventDefault();
    window.addEventListener("beforeinstallprompt", chan);
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      const dk = () => navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
      if (document.readyState === "complete") dk();
      else window.addEventListener("load", dk, { once: true });
    }
    return () => window.removeEventListener("beforeinstallprompt", chan);
  }, []);
  return null;
}
