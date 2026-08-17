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
      onError={(e) => { const el = e.currentTarget; if (el.src !== src) el.src = src; }}
    />
  );
}
