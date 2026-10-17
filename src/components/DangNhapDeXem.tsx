"use client";

import { useState } from "react";
import { HOTLINE } from "@/lib/hotline";
import { Lock, MessageCircle, PhoneCall, ShieldCheck, X } from "lucide-react";

export default function DangNhapDeXem({ listingId, listingTitle }: { listingId?: string; listingTitle?: string }) {
  const [mo, setMo] = useState(false);

  const tinZalo = `Chào Radar, mình đang xem căn "${listingTitle || "này"}" (mã: ${listingId?.slice(0, 8) || ""}), gửi giúp mình SĐT chính chủ và hỗ trợ kiểm tra còn phòng không nhé!`;
  const linkZalo = `https://zalo.me/${HOTLINE}?text=${encodeURIComponent(tinZalo)}`;

  return (
    <>
      <button
        type="button"
        onClick={() => setMo(true)}
        className="btn w-full text-center border-2 border-brand/30 bg-brand/5 hover:bg-brand/10 text-brand font-bold py-2.5 rounded-lg inline-flex items-center justify-center gap-2 transition"
      >
        <Lock className="w-4 h-4 text-brand" />
        <span>Bấm để nhận SĐT &amp; kiểm tra còn phòng</span>
      </button>

      {mo && (
        <div
          className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-sm grid place-items-center p-4 animate-in fade-in duration-200"
          onClick={() => setMo(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setMo(false)}
              aria-label="Đóng"
              className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 text-emerald-700 text-xs font-bold mb-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Hỗ trợ kết nối chính chủ miễn phí</span>
            </div>

            <h3 className="text-lg font-bold text-slate-900 leading-snug">
              Xem số điện thoại &amp; video phòng
            </h3>
            <p className="text-xs text-slate-600 mt-1 mb-5 leading-relaxed">
              Để tránh tin ảo và môi giới kê giá, bạn có thể nhận SĐT đã xác minh qua Zalo hoặc tạo tài khoản để xem trực tiếp.
            </p>

            {/* Các lựa chọn chuyển đổi */}
            <div className="space-y-2.5">
              <a
                href={linkZalo}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl font-extrabold text-sm text-white bg-[#0068ff] hover:bg-[#0057d9] active:scale-[0.99] transition shadow-md flex items-center justify-center gap-2 text-center"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
                <span>Nhận SĐT &amp; Video qua Zalo (Nhanh nhất)</span>
              </a>

              <a
                href={`tel:${HOTLINE}`}
                className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 transition flex items-center justify-center gap-2 text-center"
              >
                <PhoneCall className="w-3.5 h-3.5 text-brand" />
                <span>Hoặc gọi Hotline Radar: 0346 689 460</span>
              </a>

              <div className="pt-3 border-t border-slate-100 mt-3 text-center">
                <span className="text-xs text-slate-400 block mb-2">Hoặc xem số trực tiếp trên web:</span>
                <div className="flex gap-2">
                  <a
                    href="/auth?mode=register"
                    className="flex-1 py-2 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition text-center"
                  >
                    Đăng ký nhanh
                  </a>
                  <a
                    href="/auth"
                    className="flex-1 py-2 px-3 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition text-center"
                  >
                    Đăng nhập
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
