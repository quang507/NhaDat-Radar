"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export default function NutQuayLai({ fallbackHref = "/search" }: { fallbackHref?: string }) {
  const router = useRouter();

  const handleBack = () => {
    // Nếu có lịch sử duyệt trang trước đó trong cùng tab thì lùi lại để giữ nguyên bộ lọc & scroll
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      className="text-sm text-[var(--ink-soft)] font-semibold inline-flex items-center gap-1 hover:text-brand transition-colors cursor-pointer"
      aria-label="Quay lại trang trước"
    >
      <ChevronLeft className="w-4 h-4" />
      <span>Quay lại</span>
    </button>
  );
}
