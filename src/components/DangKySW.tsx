"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Download, X, Share2, Sparkles, PlusSquare } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

const DISMISS_KEY = "ndr_pwa_dismissed_until";

// Đăng ký Service Worker + Quản lý Banner PWA "Cài đặt ứng dụng vào màn hình chính" (Mobile CRO)
export default function DangKySW() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // 1. Đăng ký Service Worker
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      const dk = () => navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
      if (document.readyState === "complete") dk();
      else window.addEventListener("load", dk, { once: true });
    }

    // 2. Kiểm tra nếu đã cài đặt PWA (standalone)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    // 3. Kiểm tra nếu người dùng đã bấm tắt gần đây (trong vòng 7 ngày)
    try {
      const dismissedUntil = localStorage.getItem(DISMISS_KEY);
      if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
        return;
      }
    } catch {}

    // 4. Bắt sự kiện cài đặt của Android / Chrome / Edge
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Đợi 3 giây sau khi vào trang mới hiện nhẹ nhàng để không cản trở LCP
      setTimeout(() => setShowPrompt(true), 3000);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // 5. Kiểm tra thiết bị iOS Safari
    const ua = navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua) && !("MSStream" in window);
    const isSafari = /safari/.test(ua) && !/chrome|crios|fxios|android/.test(ua);

    if (isIosDevice && isSafari) {
      setIsIOS(true);
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 5000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      };
    }

    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIOSGuide(false);
    try {
      // Ẩn trong 7 ngày
      localStorage.setItem(DISMISS_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
    } catch {}
  };

  if (!showPrompt) return null;

  return (
    <aside
      role="banner"
      aria-label="Cài đặt ứng dụng Radar Nhà Đất"
      className="fixed left-3 right-3 sm:left-auto sm:right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] sm:bottom-6 z-50 sm:max-w-md animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="bg-[var(--surface)] text-[var(--ink)] border border-brand/30 dark:border-brand/50 rounded-xl p-3.5 shadow-xl backdrop-blur-md relative overflow-hidden">
        {/* Dải gradient thương hiệu */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 via-teal-500 to-brand" />

        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-brand/10 p-1 flex items-center justify-center shrink-0 border border-brand/20">
            <Image
              src="/icon-192.png"
              alt="Radar Nhà Đất"
              width={36}
              height={36}
              className="rounded-lg object-cover"
            />
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-brand uppercase tracking-wider">
              <Sparkles className="w-3 h-3" />
              <span>Cài đặt ứng dụng</span>
            </div>
            <h4 className="font-bold text-xs sm:text-sm text-[var(--ink)] leading-snug mt-0.5">
              Cài Radar Nhà Đất vào máy
            </h4>
            <p className="text-[11px] text-[var(--ink-soft)] leading-normal mt-0.5">
              Mở nhanh từ màn hình chính, tra cứu phòng giá thật mượt mà và nhận thông báo mới.
            </p>

            {showIOSGuide ? (
              <div className="mt-2.5 p-2 rounded-lg bg-brand/5 border border-brand/20 text-[11px] text-[var(--ink)] space-y-1">
                <div className="font-semibold flex items-center gap-1 text-brand">
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Cách thêm trên iPhone/iPad:</span>
                </div>
                <p>1. Bấm nút <b>Chia sẻ</b> (<Share2 className="w-3 h-3 inline text-blue-500" />) ở thanh dưới Safari</p>
                <p>2. Cuộn xuống chọn <b>&ldquo;Thêm vào MH chính&rdquo;</b> (<PlusSquare className="w-3 h-3 inline" />)</p>
              </div>
            ) : null}

            <div className="flex items-center gap-2 mt-3">
              <button
                type="button"
                onClick={handleInstallClick}
                className="btn btn-primary h-8 px-3 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isIOS ? "Xem cách cài" : "Cài đặt ngay"}</span>
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="btn h-8 px-2.5 rounded-lg text-xs text-[var(--ink-soft)] hover:bg-[var(--surface-2)] cursor-pointer"
              >
                Để sau
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Đóng thông báo cài đặt"
            className="absolute top-2.5 right-2.5 w-7 h-7 rounded-lg text-[var(--ink-soft)] hover:bg-[var(--surface-2)] flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
