"use client";

import { useState } from "react";
import { hiRes } from "@/lib/img";
import { Building2 } from "lucide-react";

export default function SafeImg({
  src,
  alt,
  className,
  fallbackLabel,
  the = false,
}: {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
  /** ảnh thẻ tin (~300px): không nâng ảnh lên 1275px (2/11, audit P10) */
  the?: boolean;
}) {
  const [error, setError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(hiRes(src, the));

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-[var(--surface-2)] text-[var(--ink-faint)]">
        <Building2 className="w-8 h-8 opacity-60" />
        {fallbackLabel && (
          <span className="text-overline font-bold uppercase tracking-wider text-[var(--ink-faint)]">
            {fallbackLabel}
          </span>
        )}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={currentSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
      referrerPolicy={/fbcdn\.net|scontent/.test(currentSrc) ? "no-referrer" : undefined}
      onError={() => {
        if (currentSrc !== src) {
          setCurrentSrc(src);
        } else {
          setError(true);
        }
      }}
    />
  );
}
