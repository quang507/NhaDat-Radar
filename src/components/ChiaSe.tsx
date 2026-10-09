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
  async function chep() {
    try { await navigator.clipboard.writeText(url); setDaChep(true); setTimeout(() => setDaChep(false), 2000); } catch { /* trình duyệt chặn clipboard */ }
  }

  return (
    <span className="relative">
      <button type="button" onClick={bam} aria-expanded={mo} aria-label="Chia sẻ tin"
        className="h-8 px-3 rounded-full flex items-center justify-center gap-1.5 text-xs font-semibold transition shadow bg-white/90 text-[#333] hover:bg-white">
        <Share2 className="w-3.5 h-3.5" />
        <span>Chia sẻ</span>
      </button>
      {mo && (
        <span className="absolute right-0 top-10 z-20 w-52 card rounded-lg shadow-lg p-1.5 flex flex-col text-sm">
          <button type="button" onClick={chep} className="text-left px-3 py-2 rounded hover:bg-[var(--surface-2)] flex items-center gap-2">
            {daChep ? (
              <>
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-emerald-600 font-semibold">Đã chép link</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-slate-500 shrink-0" />
                <span>Sao chép link</span>
              </>
            )}
          </button>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} target="_blank" rel="noopener"
            className="px-3 py-2 rounded hover:bg-[var(--surface-2)] flex items-center gap-2">
            <Share2 className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Chia sẻ Facebook</span>
          </a>
        </span>
      )}
    </span>
  );
}
