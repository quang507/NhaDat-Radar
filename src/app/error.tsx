"use client";

import { useEffect } from "react";
import Link from "next/link";
import { baoGA } from "@/lib/su-kien-client";
import { HOTLINE, HOTLINE_DISPLAY } from "@/lib/hotline";
import { AlertTriangle, RotateCcw, Home, PhoneCall } from "lucide-react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("AppError:", error?.digest || error?.message || "unknown");
    baoGA("ndr_client_error", {
      page: typeof location !== "undefined" ? location.pathname.slice(0, 80) : "",
      msg: String(error?.message || "unknown").slice(0, 80),
    });
  }, [error]);

  return (
    <div className="min-h-[60vh] grid place-items-center px-4 py-12">
      <div className="card rounded-xl p-6 sm:p-8 max-w-md w-full text-center border border-[var(--line)]">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-600 grid place-items-center mx-auto mb-3">
          <AlertTriangle className="w-6 h-6" />
        </div>
        <h1 className="heading-3 text-[var(--ink)] mb-2">Trang gặp sự cố tạm thời</h1>
        <p className="text-sm text-[var(--ink-soft)] mb-5 leading-relaxed">
          Nếu bạn đang bật tự động dịch trang trên trình duyệt, hãy thử tắt dịch cho trang này rồi bấm Thử lại.
        </p>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            type="button"
            onClick={() => reset()}
            className="btn btn-primary min-h-11 flex-1 inline-flex items-center justify-center gap-1.5 font-bold cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Thử lại</span>
          </button>
          <Link
            href="/"
            className="btn min-h-11 flex-1 inline-flex items-center justify-center gap-1.5 border border-[var(--line-strong)]"
          >
            <Home className="w-4 h-4" />
            <span>Về trang chủ</span>
          </Link>
        </div>
        <div className="mt-4 pt-3 border-t border-[var(--line)] text-xs text-[var(--ink-faint)]">
          Cần hỗ trợ gấp?{" "}
          <a href={`tel:${HOTLINE}`} className="text-brand font-semibold hover:underline inline-flex items-center gap-1">
            <PhoneCall className="w-3 h-3" />
            <span>Gọi {HOTLINE_DISPLAY}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
