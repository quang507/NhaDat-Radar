"use client";

import { useEffect, useState, type AnchorHTMLAttributes } from "react";
import { baoSuKien } from "@/lib/su-kien-client";
import { Check, Copy } from "lucide-react";

// Theo dõi quan tâm (30/9) - xem lib/su-kien-client + migration 031.

/** Đặt 1 lần trong trang chi tiết tin: ghi lượt xem, mỗi phiên trình duyệt 1 lần/tin (F5 không đếm lại) */
export function GhiXemTin({ listingId }: { listingId: string }) {
  useEffect(() => {
    try {
      const k = `ndr_xem_${listingId}`;
      if (sessionStorage.getItem(k)) return;
      sessionStorage.setItem(k, "1");
    } catch { /* chặn sessionStorage -> vẫn ghi */ }
    baoSuKien("xem", listingId);
  }, [listingId]);
  return null;
}

/** <a> ghi sự kiện khi bấm (gọi / Zalo) - thay cho <a href="tel:..."> trong server component */
export function LinkTheoDoi({ loai, listingId, ...a }: AnchorHTMLAttributes<HTMLAnchorElement> & { loai: "goi" | "zalo"; listingId: string }) {
  return <a {...a} onClick={(e) => { baoSuKien(loai, listingId); a.onClick?.(e); }} />;
}

/**
 * Nút Zalo CHÉP SẴN TIN NHẮN (2/10): zalo.me/<số> không điền sẵn nội dung được, khách mở ra khung chat trống
 * rồi không biết hỏi gì / quên mã phòng -> Radar không biết khách hỏi phòng nào. Bấm là chép sẵn
 * "Chào Radar, em muốn xem phòng RH1A2B3C ..." vào bộ nhớ tạm + nhắc "dán vào Zalo", rồi mở Zalo như cũ.
 */
// 29/10: listingId không bắt buộc - trang chủ, định giá, tìm kiếm cũng chép sẵn tin nhắn (trước dùng ?text= nên khách mở ra khung trống)
export function NutZalo({ listingId, tinNhan, children, ...a }: AnchorHTMLAttributes<HTMLAnchorElement> & { listingId?: string | null; tinNhan: string }) {
  const [daChep, setDaChep] = useState(false);
  return (
    <>
      <a {...a} onClick={(e) => {
        baoSuKien("zalo", listingId);
        try {
          const tn = `${tinNhan}\n${location.origin}${location.pathname}`;
          void navigator.clipboard?.writeText(tn).then(() => { setDaChep(true); setTimeout(() => setDaChep(false), 6000); });
        } catch { /* trình duyệt chặn clipboard: vẫn mở Zalo */ }
        a.onClick?.(e);
      }}>{children}</a>
      {daChep && (
        <span role="status" className="fixed left-1/2 -translate-x-1/2 bottom-24 z-50 max-w-[90vw] px-4 py-2.5 rounded-2xl bg-[#0068ff] text-white text-xs sm:text-sm font-semibold shadow-2xl flex items-center gap-2 border border-white/20 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <Check className="w-3.5 h-3.5 text-white stroke-[3]" />
          </span>
          <span>Đã chép nội dung{listingId ? <> &amp; mã phòng</> : null} - mở Zalo và chọn <b>Dán</b> để gửi</span>
        </span>
      )}
    </>
  );
}

/**
 * Nhãn "Mã: RH…" bấm để chép (29/10): Clarity ghi dead click nhiều nhất trang tin ở đúng nhãn này - khách bấm
 * vào mã để chép mà không có gì xảy ra. Chép xong đổi chữ thành "Đã chép" 2 giây (không cần toast).
 */
export function NutChepMa({ ma, className }: { ma: string; className?: string }) {
  const [daChep, setDaChep] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Chép mã ${ma}`}
      title="Bấm để chép mã - gửi kèm khi nhắn Zalo"
      className={className}
      onClick={() => {
        try {
          void navigator.clipboard?.writeText(ma).then(() => { setDaChep(true); setTimeout(() => setDaChep(false), 2000); });
        } catch { /* trình duyệt chặn clipboard: mã vẫn bôi đen chép tay được */ }
      }}
    >
      {daChep ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5 opacity-70" />}
      <span aria-live="polite">{daChep ? "Đã chép mã" : `Mã: ${ma}`}</span>
    </button>
  );
}
