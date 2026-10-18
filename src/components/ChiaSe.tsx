"use client";

import { useState } from "react";
import { baoSuKien } from "@/lib/su-kien-client";
import { Share2, Check, Copy } from "lucide-react";

// Nút chia sẻ tin (29/9, Mogi có FB/Messenger/Zalo). Khách thuê phòng hay gửi tin cho bạn ở ghép.
// Điện thoại: bảng chia sẻ của hệ điều hành (navigator.share - có sẵn Zalo, Messenger...).
// Máy tính (không có navigator.share): menu nhỏ Sao chép link + Facebook. Zalo/Messenger trên web
// cần app id của họ nên không làm - người dùng dán link đã chép.
export default function ChiaSe({ url, title, listingId }: { url: string; title: string; listingId?: string }) {
  const [mo, setMo] = useState(false);
  const [daChep, setDaChep] = useState(false);

  async function bam() {
    baoSuKien("chia_se", listingId);
    if (typeof navigator !== "undefined" && navigator.share) {
      try { await navigator.share({ title, url }); } catch { /* người dùng đóng bảng chia sẻ */ }
      return;
    }
    setMo((v) => !v);
  }
  async function chepFormat() {
    const textZalo = `${title}\nXem chi tiết và video: ${url}\nNguồn: Radar Nhà Đất`;
    try {
      await navigator.clipboard.writeText(textZalo);
      setDaChep(true);
      setTimeout(() => setDaChep(false), 2500);
    } catch {
      /* trình duyệt chặn clipboard */
    }
  }

  return (
    <span className="relative">
      <button
        type="button"
        onClick={bam}
        aria-expanded={mo}
        aria-label="Chia sẻ tin"
        className="h-8 px-3 rounded-md flex items-center justify-center gap-1.5 text-xs font-semibold transition border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:border-brand dark:hover:border-emerald-500 shadow-xs cursor-pointer"
      >
        <Share2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
        <span>Chia sẻ</span>
      </button>
      {mo && (
        <span className="absolute right-0 top-10 z-20 w-60 card rounded-lg shadow-md p-1.5 flex flex-col text-xs border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <button
            type="button"
            onClick={chepFormat}
            className="text-left px-3 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium cursor-pointer"
          >
            {daChep ? (
              <>
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Đã chép nội dung gửi Zalo!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-brand dark:text-emerald-400 shrink-0" />
                <span>Chép tóm tắt gửi Zalo/Khách</span>
              </>
            )}
          </button>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noopener"
            className="px-3 py-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700/60 flex items-center gap-2 text-slate-700 dark:text-slate-200 font-medium cursor-pointer"
          >
            <Share2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Chia sẻ qua Facebook</span>
          </a>
        </span>
      )}
    </span>
  );
}
