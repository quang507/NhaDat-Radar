"use client";

import { useEffect, type AnchorHTMLAttributes } from "react";
import { baoSuKien } from "@/lib/su-kien-client";

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
