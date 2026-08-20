"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { hiRes } from "@/lib/img";

// Gallery kiểu iPhone Photos: vuốt trực tiếp trên ảnh chính (CSS scroll-snap = quán tính
// native, mượt), bấm ảnh mở lightbox toàn màn hình cũng vuốt được, phím ←/→/Esc vẫn chạy.

// Ảnh hi-res, lỗi thì rơi về URL gốc; ảnh fbcdn phải no-referrer (giống SafeImg)
function Img({ src, className, alt, eager, onClick }: {
  src: string; className: string; alt: string; eager?: boolean; onClick?: () => void;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={hiRes(src)}
      alt={alt}
      className={className}
      loading={eager ? "eager" : "lazy"}
      draggable={false}
      onClick={onClick}
      referrerPolicy={/fbcdn\.net|scontent/.test(src) ? "no-referrer" : undefined}
      onError={(e) => { const el = e.currentTarget; if (el.src !== src) el.src = src; }}
    />
  );
}

// Track vuốt ngang dùng chung cho ảnh chính + lightbox
function useSnapTrack(n: number, onIndexChange: (i: number) => void) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const onScroll = useCallback(() => {
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      onIndexChange(Math.max(0, Math.min(n - 1, Math.round(el.scrollLeft / el.clientWidth))));
    });
  }, [n, onIndexChange]);
  const scrollTo = useCallback((i: number, smooth = true) => {
    const el = ref.current;
    if (el) el.scrollTo({ left: i * el.clientWidth, behavior: smooth ? "smooth" : "auto" });
  }, []);
  return { ref, onScroll, scrollTo };
}

export default function Gallery({ images, title }: { images: string[]; title: string }) {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);       // ảnh đang xem trong lightbox
  const [heroIdx, setHeroIdx] = useState(0); // ảnh đang xem ở carousel trang chi tiết
  const n = images.length;

  const hero = useSnapTrack(n, setHeroIdx);
  const box = useSnapTrack(n, setIdx);
  const thumbRow = useRef<HTMLDivElement>(null);

  const go = useCallback((d: number) => {
    box.scrollTo(Math.max(0, Math.min(n - 1, idx + d)));
  }, [box, idx, n]);

  // Mở lightbox tại đúng ảnh đang xem (nhảy thẳng, không animation)
  const openAt = useCallback((i: number) => {
    setIdx(i);
    setOpen(true);
    requestAnimationFrame(() => box.scrollTo(i, false));
  }, [box]);

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

  // Thumbnail đang xem tự cuộn vào giữa
  useEffect(() => {
    if (!open) return;
    thumbRow.current?.children[idx]?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [open, idx]);

  if (!n) return null;

  return (
    <>
      {/* Carousel ảnh chính: vuốt xem hết ảnh ngay tại trang, không cần mở lightbox */}
      <div className="relative rounded-lg overflow-hidden aspect-[16/9] max-h-[480px] bg-[var(--surface-2)]">
        <div
          ref={hero.ref}
          onScroll={hero.onScroll}
          className="flex h-full w-full overflow-x-auto snap-x snap-mandatory scrollbar-none overscroll-x-contain"
        >
          {images.map((img, i) => (
            <Img
              key={i}
              src={img}
              alt={i === 0 ? title : `${title} - ảnh ${i + 1}`}
              eager={Math.abs(i - heroIdx) <= 1}
              className="w-full h-full shrink-0 snap-center object-cover cursor-zoom-in"
              onClick={() => openAt(i)}
            />
          ))}
        </div>
        <span className="absolute bottom-3 right-3 text-xs font-bold px-2.5 py-1 rounded-lg bg-black/60 text-white pointer-events-none">
          {heroIdx + 1}/{n} · vuốt để xem - bấm phóng to 🔍
        </span>
        {n > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 pointer-events-none">
            {images.slice(0, 8).map((_, i) => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full transition ${i === Math.min(heroIdx, 7) ? "bg-white" : "bg-white/40"}`} />
            ))}
          </div>
        )}
      </div>
      {n > 1 && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mt-2">
          {images.slice(1, 6).map((img, i) => (
            <div key={i} className="relative">
              <Img
                src={img}
                alt=""
                className="aspect-[4/3] w-full object-cover rounded-lg cursor-zoom-in hover:opacity-90 transition"
                onClick={() => openAt(i + 1)}
              />
              {i === 4 && n > 6 && (
                <button
                  onClick={() => openAt(5)}
                  className="absolute inset-0 rounded-lg bg-black/55 text-white font-bold text-sm grid place-items-center"
                >
                  +{n - 6} ảnh
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox: track vuốt toàn màn hình */}
      {open && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 text-white text-sm">
            <span className="font-semibold">{idx + 1} / {n}</span>
            <button aria-label="Đóng thư viện ảnh" className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 text-lg" onClick={() => setOpen(false)}>✕</button>
          </div>
          <div className="flex-1 relative min-h-0">
            <div
              ref={box.ref}
              onScroll={box.onScroll}
              className="flex h-full w-full overflow-x-auto snap-x snap-mandatory scrollbar-none overscroll-x-contain"
            >
              {images.map((img, i) => (
                <div key={i} className="w-full h-full shrink-0 snap-center grid place-items-center px-2 pb-2">
                  <Img
                    src={img}
                    alt={title}
                    eager={Math.abs(i - idx) <= 1}
                    className="max-h-full max-w-full object-contain select-none"
                  />
                </div>
              ))}
            </div>
            {n > 1 && (
              <>
                <button
                  aria-label="Ảnh trước"
                  onClick={() => go(-1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white text-xl max-sm:hidden"
                >‹</button>
                <button
                  aria-label="Ảnh sau"
                  onClick={() => go(1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white text-xl max-sm:hidden"
                >›</button>
              </>
            )}
          </div>
          {n > 1 && (
            <div ref={thumbRow} className="flex gap-2 px-4 pb-4 overflow-x-auto sm:justify-center">
              {images.map((img, i) => (
                <Img
                  key={i}
                  src={img}
                  alt=""
                  className={`h-14 w-20 object-cover rounded-md cursor-pointer shrink-0 ${i === idx ? "ring-2 ring-white" : "opacity-50 hover:opacity-90"}`}
                  onClick={() => box.scrollTo(i)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
