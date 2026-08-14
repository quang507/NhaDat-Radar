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
      onError={(e) => { const el = e.currentTarget; if (el.src !== src) el.src = src; }}
    />
  );
}
