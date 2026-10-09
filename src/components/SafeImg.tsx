"use client";

import { useState } from "react";
import { hiRes } from "@/lib/img";
import { Building2 } from "lucide-react";

export default function SafeImg({
  src,
  alt,
  className,
  fallbackLabel,
}: {
  src: string;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}) {
  const [error, setError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(hiRes(src));

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-slate-100 text-slate-400">
        <Building2 className="w-8 h-8 opacity-60" />
        {fallbackLabel && (
          <span className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-500">
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
