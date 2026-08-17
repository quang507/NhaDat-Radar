"use client";

import { useCallback, useEffect, useState } from "react";
import { hiRes } from "@/lib/img";

// Gallery + lightbox: bấm ảnh phóng to toàn màn hình, phím ←/→/Esc, ảnh bản phân giải cao.
export default function Gallery({ images, title }: { images: string[]; title: string }) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const n = images.length;

  const go = useCallback((d: number) => setIdx((i) => (i + d + n) % n), [n]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      else if (e.key === "ArrowLeft") go(-1);
      else if (e.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, go]);

  if (!n) return null;

  // Ảnh chính dùng bản hi-res, lỗi thì rơi về URL gốc
  const Img = ({ src, className, alt, onClick }: { src: string; className: string; alt: string; onClick?: () => void }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={hiRes(src)}
      alt={alt}
      className={className}
      onClick={onClick}
      onError={(e) => { const el = e.currentTarget; if (el.src !== src) el.src = src; }}
    />
  );

  return (
    <>
      <div className="relative rounded-lg overflow-hidden aspect-[16/9] max-h-[480px] bg-[var(--surface-2)]">
        <Img
          src={images[0]}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover cursor-zoom-in"
          onClick={() => { setIdx(0); setOpen(true); }}
        />
        <span className="absolute bottom-3 right-3 text-xs font-bold px-2.5 py-1 rounded-lg bg-black/60 text-white">
          🔍 {n} ảnh — bấm để phóng to
        </span>
      </div>
      {n > 1 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mt-2">
          {images.slice(1, 6).map((img, i) => (
            <div key={i} className="relative">
              <Img
                src={img}
                alt=""
                className="aspect-[4/3] w-full object-cover rounded-lg cursor-zoom-in hover:opacity-90 transition"
                onClick={() => { setIdx(i + 1); setOpen(true); }}
              />
              {i === 4 && n > 6 && (
                <button
                  onClick={() => { setIdx(5); setOpen(true); }}
                  className="absolute inset-0 rounded-lg bg-black/55 text-white font-bold text-sm grid place-items-center"
                >
                  +{n - 6} ảnh
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {open && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col" onClick={() => setOpen(false)}>
          <div className="flex items-center justify-between px-4 py-3 text-white text-sm" onClick={(e) => e.stopPropagation()}>
            <span className="font-semibold">{idx + 1} / {n}</span>
            <button aria-label="Đóng thư viện ảnh" className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-lg" onClick={() => setOpen(false)}>✕</button>
          </div>
          <div className="flex-1 relative flex items-center justify-center px-2 pb-4" onClick={(e) => e.stopPropagation()}>
            <Img src={images[idx]} alt={title} className="max-h-full max-w-full object-contain select-none" />
            {n > 1 && (
              <>
                <button
                  aria-label="Ảnh trước"
                  onClick={() => go(-1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white text-xl"
                >‹</button>
                <button
                  aria-label="Ảnh sau"
                  onClick={() => go(1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white text-xl"
                >›</button>
              </>
            )}
          </div>
          {n > 1 && (
            <div className="flex gap-2 px-4 pb-4 overflow-x-auto justify-center" onClick={(e) => e.stopPropagation()}>
              {images.map((img, i) => (
                <Img
                  key={i}
                  src={img}
                  alt=""
                  className={`h-14 w-20 object-cover rounded-md cursor-pointer shrink-0 ${i === idx ? "ring-2 ring-white" : "opacity-50 hover:opacity-90"}`}
                  onClick={() => setIdx(i)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
