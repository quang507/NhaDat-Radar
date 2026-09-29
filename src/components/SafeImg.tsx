"use client";

import { hiRes } from "@/lib/img";

// Ảnh ưu tiên bản phân giải cao, tự rơi về URL gốc nếu bản lớn 404.
export default function SafeImg({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={hiRes(src)}
      alt={alt}
      loading="lazy"
      className={className}
      // Ảnh CDN Facebook (tin cào FB, 17/8): gửi kèm Referer của mình dễ bị fbcdn từ chối -> không gửi
      referrerPolicy={/fbcdn\.net|scontent/.test(src) ? "no-referrer" : undefined}
      // lỗi lần 1: thử URL gốc; lỗi tiếp (URL gốc cũng hỏng) -> ẩn ảnh để lộ nền khung, không hiện
      // chữ alt tràn ra thẻ (29/9: thẻ ngang mobile hiện nguyên tiêu đề đè lên ô ảnh)
      onError={(e) => { const el = e.currentTarget; if (!el.dataset.goc) { el.dataset.goc = "1"; if (el.src !== src) { el.src = src; return; } } el.style.visibility = "hidden"; }}
    />
  );
}
