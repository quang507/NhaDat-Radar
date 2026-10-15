"use client";

import { useEffect, useRef } from "react";

interface AdSenseBannerProps {
  slot?: string;
  format?: "auto" | "fluid" | "rectangle" | "horizontal";
  responsive?: boolean;
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle?: Array<Record<string, unknown>>;
  }
}

export default function AdSenseBanner({
  slot,
  format = "auto",
  responsive = true,
  className = "",
}: AdSenseBannerProps) {
  const adRef = useRef<HTMLModElement>(null);
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim();
  const adSlot = slot || process.env.NEXT_PUBLIC_ADSENSE_DEFAULT_SLOT?.trim();

  useEffect(() => {
    if (!clientId || !adSlot) return;

    try {
      if (typeof window !== "undefined") {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      }
    } catch (err) {
      // Bỏ qua lỗi adblock hoặc tải trùng
      console.warn("AdSense push error:", err);
    }
  }, [clientId, adSlot]);

  // Nếu chưa cấu hình Client ID hoặc Ad Slot thì không render
  if (!clientId || !adSlot) {
    return null;
  }

  return (
    <aside
      aria-label="Quảng cáo tài trợ"
      className={`my-6 overflow-hidden flex flex-col items-center justify-center min-h-[90px] bg-[var(--surface)] border border-[var(--line)] rounded-2xl p-2 ${className}`}
    >
      <span className="text-[10px] uppercase tracking-wider text-[var(--ink-faint)] mb-1">
        Quảng cáo
      </span>
      <ins
        ref={adRef}
        className="adsbygoogle block w-full"
        style={{ display: "block" }}
        data-ad-client={clientId}
        data-ad-slot={adSlot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
    </aside>
  );
}
