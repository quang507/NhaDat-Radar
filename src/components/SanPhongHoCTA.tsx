"use client";

import { HOTLINE, HOTLINE_DISPLAY, HOTLINE_ZALO } from "@/lib/hotline";
import { LinkTheoDoi, NutZalo } from "./TheoDoi";
import { Phone, MessageCircle, Clock, ShieldCheck, Sparkles } from "lucide-react";

interface SanPhongHoCTAProps {
  tieuDe?: string;
  moTa?: string;
  tinNhanZalo: string;
}

export default function SanPhongHoCTA({
  tieuDe = "Chưa tìm được phòng trọ ưng ý?",
  moTa = "Nhắn tiêu chí (tài chính, khu vực, tiện ích mong muốn), trợ lý Radar sẽ lọc rổ hàng phòng trống của Radar và gửi bạn 3 lựa chọn tốt nhất trong 15 phút.",
  tinNhanZalo,
}: SanPhongHoCTAProps) {
  return (
    <div className="my-10 relative overflow-hidden rounded-2xl border border-brand/30 bg-gradient-to-br from-brand/10 via-[var(--surface-1)] to-[var(--surface-0)] p-6 sm:p-8 shadow-sm">
      {/* Decorative accent */}
      <div className="absolute -top-12 -right-12 w-40 h-40 bg-brand/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand/15 text-brand text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            DỊCH VỤ SĂN PHÒNG HỘ - HOÀN TOÀN MIỄN PHÍ
          </div>
          <h3 className="text-xl sm:text-2xl font-extrabold text-[var(--text-1)] tracking-tight">
            {tieuDe}
          </h3>
          <p className="mt-2 text-sm text-[var(--text-2)] leading-relaxed">
            {moTa}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-[var(--text-3)] font-medium">
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              Phòng trống đã xác minh thực tế
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-brand shrink-0" />
              Phản hồi trong 15 phút
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch lg:items-center gap-3 shrink-0">
          <NutZalo
            tinNhan={tinNhanZalo}
            href={HOTLINE_ZALO}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[46px] px-5 py-3 rounded-xl bg-[#0068ff] hover:bg-[#0057d6] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all duration-150 active:scale-98"
          >
            <MessageCircle className="w-4 h-4 fill-white shrink-0" />
            <span>Nhờ Radar tìm phòng qua Zalo</span>
          </NutZalo>

          {/* 2/11 (audit Q6): ghi ndr_goi */}
          <LinkTheoDoi
            loai="goi"
            href={`tel:${HOTLINE}`}
            className="min-h-[46px] px-5 py-3 rounded-xl bg-[var(--surface-1)] hover:bg-[var(--surface-2)] text-[var(--text-1)] border border-[var(--border)] font-bold text-sm flex items-center justify-center gap-2 transition-colors active:scale-98"
          >
            <Phone className="w-4 h-4 text-brand shrink-0" />
            <span>Gọi {HOTLINE_DISPLAY}</span>
          </LinkTheoDoi>
        </div>
      </div>
    </div>
  );
}
