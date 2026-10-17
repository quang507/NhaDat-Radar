"use client";

import { useState } from "react";
import { HOTLINE } from "@/lib/hotline";
import { Lock, MessageCircle, PhoneCall, ShieldCheck, X } from "lucide-react";

export default function DangNhapDeXem({ listingId, listingTitle }: { listingId?: string; listingTitle?: string }) {
  const [mo, setMo] = useState(false);

  const tinZalo = `Chào Radar, mình đang xem căn "${listingTitle || "này"}" (mã: ${listingId?.slice(0, 8) || ""}), gửi giúp mình SĐT chính chủ và hỗ trợ kiểm tra còn phòng không nhé!`;
  const linkZalo = `https://zalo.me/${HOTLINE}?text=${encodeURIComponent(tinZalo)}`;

  return (
    <div className="flex flex-col gap-2">
      {/* Nút chính: 1-chạm mở Zalo trực tiếp, kèm nội dung căn cần xem */}
      <a
        href={linkZalo}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full py-2.5 px-3.5 rounded-lg font-bold text-xs sm:text-sm text-white bg-[#0068ff] hover:bg-[#0057d9] active:scale-[0.99] transition shadow-xs flex items-center justify-center gap-2 text-center"
      >
        <MessageCircle className="w-4 h-4 fill-current shrink-0" />
        <span>Nhắn Zalo nhận SĐT &amp; Video</span>
      </a>

      {/* Nút phụ: Mở popup nếu muốn xem các lựa chọn khác hoặc đăng nhập */}
      <button
        type="button"
        onClick={() => setMo(true)}
        className="btn w-full text-center border border-[var(--line-strong)] bg-[var(--surface-2)] hover:bg-[var(--line)] text-[var(--ink-soft)] font-medium py-1.5 rounded-lg inline-flex items-center justify-center gap-1.5 transition text-xs cursor-pointer"
      >
        <Lock className="w-3.5 h-3.5 text-slate-400" />
        <span>Tùy chọn kết nối khác</span>
      </button>

      {mo && (
        <div
          className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-xs grid place-items-center p-4 animate-in fade-in duration-200"
          onClick={() => setMo(false)}
        >
          <div
            className="bg-white dark:bg-slate-850 rounded-lg p-5 sm:p-6 max-w-md w-full shadow-lg border border-slate-200 dark:border-slate-700 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setMo(false)}
              aria-label="Đóng"
              className="absolute top-4 right-4 w-7 h-7 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 text-xs font-bold mb-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Hỗ trợ kết nối chính chủ miễn phí</span>
            </div>

            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 leading-snug">
              Xem số điện thoại &amp; video phòng
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 mb-4 leading-relaxed">
              Để tránh tin ảo và môi giới kê giá, bạn có thể nhận SĐT đã xác minh qua Zalo hoặc tạo tài khoản để xem trực tiếp.
            </p>

            {/* Các lựa chọn chuyển đổi */}
            <div className="space-y-2">
              <a
                href={linkZalo}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-md font-bold text-xs sm:text-sm text-white bg-[#0068ff] hover:bg-[#0057d9] transition shadow-xs flex items-center justify-center gap-2 text-center"
              >
                <MessageCircle className="w-4 h-4 fill-current shrink-0" />
                <span>Nhận SĐT &amp; Video qua Zalo (Nhanh nhất)</span>
              </a>

              <a
                href={`tel:${HOTLINE}`}
                className="w-full py-2.5 px-4 rounded-md font-bold text-xs text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center justify-center gap-2 text-center"
              >
                <PhoneCall className="w-3.5 h-3.5 text-brand dark:text-emerald-400" />
                <span>Hoặc gọi Hotline Radar: 0346 689 460</span>
              </a>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-700/80 mt-3 text-center">
                <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-2">Hoặc xem số trực tiếp trên web:</span>
                <div className="flex gap-2">
                  <a
                    href="/auth?mode=register"
                    className="flex-1 py-1.5 px-3 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-center"
                  >
                    Đăng ký nhanh
                  </a>
                  <a
                    href="/auth"
                    className="flex-1 py-1.5 px-3 rounded-md border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-center"
                  >
                    Đăng nhập
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
