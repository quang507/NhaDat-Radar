"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Đồng ý cookie không thiết yếu (Luật 91/2025 Điều 9, 28 - audit pháp lý 2/11). Chưa chọn = coi như TỪ CHỐI:
// Consent Mode mặc định "denied" đặt sẵn trong <head> (app/layout.tsx) nên GA không ghi cookie, AdSense chỉ
// phân phát quảng cáo không cá nhân hoá; Clarity (ghi phiên) không nạp. Lựa chọn lưu ở localStorage, đổi lại
// được bằng nút ở trang Chính sách bảo mật.
export const KHOA_DONG_Y = "radar-dong-y-cookie";
const TAT_CA = ["analytics_storage", "ad_storage", "ad_user_data", "ad_personalization"] as const;

function guiGtag(dongY: boolean) {
  const w = window as unknown as { gtag?: (...a: unknown[]) => void };
  w.gtag?.("consent", "update", Object.fromEntries(TAT_CA.map((k) => [k, dongY ? "granted" : "denied"])));
}

export default function DongYCookie() {
  const [hien, setHien] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KHOA_DONG_Y)) setHien(true);
    } catch {
      setHien(true);
    }
  }, []);

  if (!hien) return null;

  const chon = (dongY: boolean) => {
    try { localStorage.setItem(KHOA_DONG_Y, dongY ? "co" : "khong"); } catch {}
    guiGtag(dongY);
    // Clarity nghe sự kiện này để nạp ngay, không phải tải lại trang (components/Clarity.tsx)
    if (dongY) window.dispatchEvent(new Event("radar-dong-y"));
    setHien(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Lựa chọn cookie"
      className="fixed inset-x-0 z-50 bottom-[calc(5rem+env(safe-area-inset-bottom))] lg:bottom-4 px-4 pointer-events-none"
    >
      {/* 3/11 (UX audit #13): điện thoại 1 hàng (chữ ngắn + 2 nút 44px) - bản cũ cao ~170px che ô tìm kiếm ở màn đầu */}
      <div className="pointer-events-auto max-w-xl mx-auto bg-[var(--surface)] border border-[var(--line-strong)] rounded-sm shadow-lg p-2.5 sm:p-4 text-caption sm:text-sm flex items-center gap-2 sm:block">
        <p className="flex-1 min-w-0 text-[var(--ink-soft)] leading-snug sm:leading-relaxed">
          <span className="sm:hidden">Radar dùng cookie đo lường và quảng cáo.</span>
          <span className="hidden sm:inline">
            Radar dùng cookie đo lường (Google Analytics, Microsoft Clarity) và quảng cáo cá nhân hoá (Google AdSense).
            Từ chối vẫn dùng đầy đủ mọi tính năng.
          </span>{" "}
          <Link href="/chinh-sach-bao-mat#cookie" className="text-brand font-semibold underline">Chi tiết</Link>
        </p>
        <div className="shrink-0 flex gap-1.5 sm:mt-3 sm:grid sm:grid-cols-2 sm:gap-2">
          <button type="button" className="btn min-h-11 px-3 font-semibold" onClick={() => chon(false)}>Từ chối</button>
          <button type="button" className="btn btn-primary min-h-11 px-3 font-semibold" onClick={() => chon(true)}>Đồng ý</button>
        </div>
      </div>
    </div>
  );
}

// Nút ở trang Chính sách bảo mật: xoá lựa chọn cũ, đặt lại "denied" rồi tải lại trang để banner hỏi lại
// (Clarity đã nạp chỉ gỡ được bằng cách tải lại).
export function NutDoiCookie() {
  return (
    <button
      type="button"
      className="btn min-h-11 font-semibold"
      onClick={() => {
        try { localStorage.removeItem(KHOA_DONG_Y); } catch {}
        guiGtag(false);
        location.reload();
      }}
    >
      Thay đổi lựa chọn cookie
    </button>
  );
}
