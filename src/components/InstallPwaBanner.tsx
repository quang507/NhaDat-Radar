"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Download, X, Share2, PlusSquare } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function InstallPwaBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // 1. Kiểm tra nếu đã mở dưới dạng App standalone (đã cài đặt)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-expect-error - Safari standalone property
      window.navigator.standalone === true;

    if (isStandalone) return;

    // 2. Kiểm tra nếu người dùng đã bấm tắt trong vòng 7 ngày qua
    const dismissedTime = localStorage.getItem("ndr_pwa_dismissed");
    if (dismissedTime && Date.now() - Number(dismissedTime) < 7 * 24 * 60 * 60 * 1000) {
      return;
    }

    // 3. Xử lý trên iOS Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(ua);
    const isSafari = /safari/.test(ua) && !/chrome|crios|fxios/.test(ua);

    if (isIosDevice && isSafari) {
      setIsIos(true);
      // Hiển thị banner sau 3 giây để người dùng làm quen trang trước
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(timer);
    }

    // 4. Xử lý trên Chrome / Android / Desktop (beforeinstallprompt)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Hiện sau 2.5 giây
      setTimeout(() => setShowBanner(true), 2500);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIosGuide(false);
    localStorage.setItem("ndr_pwa_dismissed", String(Date.now()));
  };

  if (!showBanner) return null;

  return (
    <>
      {/* Floating Banner dính phía dưới màn hình */}
      <div className="fixed bottom-20 lg:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-40 bg-[var(--surface)]/95 backdrop-blur-md border border-[var(--line-strong)] rounded-2xl p-3.5 shadow-2xl animate-in fade-in slide-in-from-bottom-5 duration-300">
        <div className="flex items-center gap-3">
          <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 border border-slate-200/60 shadow-xs">
            <Image src="/icon-192.png" alt="Radar Nhà Đất" fill className="object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-xs sm:text-sm text-[var(--ink)] leading-snug truncate">
              Cài đặt Radar Nhà Đất
            </h4>
            <p className="text-[0.68rem] text-[var(--ink-soft)] leading-tight mt-0.5">
              Mở 1 chạm trên màn hình chính, xem phòng mượt mà
            </p>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-full cursor-pointer"
            aria-label="Đóng thông báo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-2.5 flex items-center gap-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="flex-1 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 text-center rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Để sau
          </button>
          <button
            type="button"
            onClick={handleInstallClick}
            className="flex-1 py-1.5 px-3 text-xs font-bold bg-brand text-white rounded-lg hover:bg-brand-ink transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Cài đặt ngay</span>
          </button>
        </div>
      </div>

      {/* Hướng dẫn cài đặt cho iOS Safari */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
          <div className="bg-[var(--surface)] w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-[var(--line)] animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-base text-[var(--ink)]">Cài đặt trên iPhone/iPad</h3>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-[var(--ink-soft)] mb-4">
              Chỉ 2 bước đơn giản để lưu Radar Nhà Đất ra màn hình chính:
            </p>
            <div className="space-y-3 text-xs text-[var(--ink)]">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold">Bước 1:</span> Bấm vào biểu tượng <b>Chia sẻ</b> (hình ô vuông có mũi tên lên) ở thanh dưới cùng Safari.
                </div>
              </div>
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold">Bước 2:</span> Cuộn xuống và chọn <b>"Thêm vào MH chính"</b> (Add to Home Screen).
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="btn btn-primary w-full mt-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </>
  );
}
