"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { hiRes } from "@/lib/img";
import { Play, X, ChevronLeft, ChevronRight, Maximize2, Copy, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDongBangBack } from "@/lib/dong-bang-back";

export interface NavItem {
  id: string;
  title: string;
  price?: string | null;
  image?: string | null;
  location?: string | null;
}

// Gallery kiểu iPhone Photos: vuốt trực tiếp trên ảnh chính (CSS scroll-snap = quán tính
// native, mượt), bấm ảnh mở lightbox toàn màn hình cũng vuốt được, phím ←/→/Esc vẫn chạy.

// Ảnh hi-res, lỗi thì rơi về URL gốc; ảnh fbcdn phải no-referrer (giống SafeImg)
// uuTien (2/11, audit P10): chỉ ảnh đầu trang tin - ảnh LCP, trình duyệt tải trước các ảnh khác
function Img({ src, className, alt, eager, uuTien, onClick }: {
  src: string; className: string; alt: string; eager?: boolean; uuTien?: boolean; onClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={hiRes(src)}
      alt={alt}
      className={className}
      loading={eager || uuTien ? "eager" : "lazy"}
      fetchPriority={uuTien ? "high" : undefined}
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

// videos (30/9, kiểu Mogi): video phòng (rổ hàng EvoHome) - nhãn "▶ Video" trên ảnh chính + ô đầu hàng ảnh nhỏ,
// bấm mở trình phát toàn màn hình. Không trộn vào track vuốt ảnh để không đụng logic snap/lightbox.
export default function Gallery({
  images,
  title,
  videos = [],
  roomCode,
  nextListing,
  prevListing,
  currentListingId,
}: {
  images: string[];
  title: string;
  videos?: string[];
  roomCode?: string;
  nextListing?: NavItem | null;
  prevListing?: NavItem | null;
  currentListingId?: string;
}) {
  const router = useRouter();
  const [transitionMsg, setTransitionMsg] = useState<string | null>(null);
  const [lastViewed, setLastViewed] = useState<NavItem | null>(null);
  const [daChepCode, setDaChepCode] = useState(false);

  // Ghi nhớ căn vừa xem từ sessionStorage
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const saved = sessionStorage.getItem("radar_prev_listing");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.id !== currentListingId) {
          setLastViewed(parsed);
        }
      }
    } catch {}
  }, [currentListingId]);

  const effectivePrev = lastViewed || prevListing;

  const navigateTo = useCallback((target: NavItem | null | undefined, direction: "next" | "prev") => {
    if (!target) return;
    try {
      if (currentListingId) {
        sessionStorage.setItem("radar_prev_listing", JSON.stringify({
          id: currentListingId,
          title,
          image: images[0] || null,
        }));
      }
    } catch {}
    setTransitionMsg(direction === "next" ? "Đang chuyển sang căn kế tiếp..." : "Đang quay lại căn vừa xem...");
    router.push(`/listings/${target.id}`);
  }, [currentListingId, title, images, router]);

  // Touch tracking cho vuốt dọc (Lướt lên = căn kế, Lướt xuống = căn vừa xem)
  const touchStartPos = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartPos.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
      time: Date.now(),
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    const deltaX = e.changedTouches[0].clientX - touchStartPos.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartPos.current.y;
    const duration = Date.now() - touchStartPos.current.time;
    touchStartPos.current = null;

    // Vuốt dọc rõ ràng (> 60px và lấn át hẳn vuốt ngang)
    if (Math.abs(deltaY) > 60 && Math.abs(deltaY) > Math.abs(deltaX) * 1.4 && duration < 600) {
      if (deltaY < -60) {
        // Vuốt lên -> Căn tiếp theo
        if (nextListing) {
          navigateTo(nextListing, "next");
        }
      } else if (deltaY > 60) {
        // Vuốt xuống -> Căn vừa xem
        if (effectivePrev) {
          navigateTo(effectivePrev, "prev");
        }
      }
    }
  };

  // Bấm ảnh chính: 1 ảnh, màn hình cảm ứng/mobile hoặc vùng giữa -> mở khung phóng to (tránh dead click); rìa trái/phải desktop nhiều ảnh -> chuyển ảnh tại chỗ
  const handleDesktopImageClick = (e: React.MouseEvent<HTMLImageElement | HTMLDivElement>) => {
    if (n <= 1 || window.matchMedia("(max-width: 767px), (pointer: coarse)").matches) {
      openAt(heroIdx);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    if (clickX < rect.width * 0.3) {
      hero.scrollTo((heroIdx - 1 + n) % n);
    } else if (clickX > rect.width * 0.7) {
      hero.scrollTo((heroIdx + 1) % n);
    } else {
      openAt(heroIdx);
    }
  };
  const [video, setVideo] = useState<string | null>(null);
  // 3/11 (Clarity: dead tap): video 4-12 MB, mạng 4G mất vài giây mới có hình -> khách chạm liên tục vào khung đen.
  // Hiện rõ đang tải / lỗi. Bỏ link "Mở video trực tiếp": mở thẳng URL kho ảnh đối tác (lộ tên nguồn rổ hàng).
  const [vidTT, setVidTT] = useState<"tai" | "chay" | "loi">("tai");
  useEffect(() => { if (video) setVidTT("tai"); }, [video]);
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
    if (!video) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setVideo(null); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [video]);

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

  // 2/11 (audit M4): nút Back Android đóng lightbox / video thay vì rời trang tin
  useDongBangBack(open, () => setOpen(false));
  useDongBangBack(!!video, () => setVideo(null));

  // Thumbnail đang xem tự cuộn vào giữa
  useEffect(() => {
    if (!open) return;
    thumbRow.current?.children[idx]?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [open, idx]);

  if (!n) return null;

  return (
    <>
      {/* Carousel ảnh chính: vuốt xem hết ảnh ngay tại trang, không cần mở lightbox */}
      <div
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="group/gallery relative rounded-lg overflow-hidden aspect-[16/9] max-h-[480px] bg-[var(--surface-2)] select-none"
      >
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
              uuTien={i === 0}
              className="w-full h-full shrink-0 snap-center object-cover cursor-pointer"
              onClick={handleDesktopImageClick}
            />
          ))}
        </div>
        {videos.length > 0 && (
          <button type="button" onClick={() => setVideo(videos[0])}
            className="absolute top-3 left-3 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-black/70 backdrop-blur-sm text-white hover:bg-black/85 transition z-10">
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Video</span>
          </button>
        )}
        {roomCode && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              try {
                void navigator.clipboard?.writeText(roomCode);
                setDaChepCode(true);
                setTimeout(() => setDaChepCode(false), 2000);
              } catch {}
            }}
            aria-label={`Chép mã ${roomCode}`}
            title="Chạm để sao chép mã phòng"
            className="absolute top-3 right-3 text-[11px] font-mono font-bold px-2.5 py-1 rounded-md bg-black/70 hover:bg-black/85 backdrop-blur-sm text-white/95 shadow-sm z-10 flex items-center gap-1 cursor-pointer transition active:scale-95"
          >
            {daChepCode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 opacity-70" />}
            <span>{daChepCode ? "Đã chép" : roomCode}</span>
          </button>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            openAt(heroIdx);
          }}
          className="absolute bottom-3 left-3 sm:left-auto sm:right-3 text-xs font-medium px-2.5 py-1 rounded-lg bg-black/60 hover:bg-black/85 backdrop-blur-sm text-white transition flex items-center gap-1.5 cursor-pointer z-10"
        >
          <span>{heroIdx + 1}/{n}</span>
          <span className="text-white/40">·</span>
          <span className="flex items-center gap-1"><Maximize2 className="w-3 h-3 text-white/80" /> Phóng to</span>
        </button>
        {n > 1 && (
          <>
            <button
              type="button"
              aria-label="Ảnh trước"
              onClick={(e) => {
                e.stopPropagation();
                hero.scrollTo((heroIdx - 1 + n) % n);
              }}
              className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/75 text-white items-center justify-center backdrop-blur-sm transition opacity-0 group-hover/gallery:opacity-100 z-10 cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              aria-label="Ảnh tiếp theo"
              onClick={(e) => {
                e.stopPropagation();
                hero.scrollTo((heroIdx + 1) % n);
              }}
              className="hidden md:flex absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/75 text-white items-center justify-center backdrop-blur-sm transition opacity-0 group-hover/gallery:opacity-100 z-10 cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
        {n > 1 && (
          <div className="absolute bottom-3 right-3 sm:right-auto sm:left-1/2 sm:-translate-x-1/2 flex gap-1.5 pointer-events-none">
            {images.slice(0, 8).map((_, i) => (
              <span key={i} className={`w-1.5 h-1.5 rounded-full transition ${i === Math.min(heroIdx, 7) ? "bg-white" : "bg-white/40"}`} />
            ))}
          </div>
        )}
      </div>
      {(n > 1 || videos.length > 0) && (
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 mt-2">
          {videos.map((v) => (
            <button key={v} type="button" onClick={() => setVideo(v)} aria-label="Xem video phòng"
              className="aspect-[4/3] w-full rounded-lg bg-[#0f172a] text-white grid place-items-center hover:opacity-90 transition">
              <span className="flex flex-col items-center gap-1">
                <Play className="w-5 h-5 fill-current" />
                <span className="text-[0.7rem] font-semibold">Video</span>
              </span>
            </button>
          ))}
          {images.slice(1, 6 - videos.length).map((img, i) => (
            <div key={i} className="relative">
              <Img
                src={img}
                alt=""
                className="aspect-[4/3] w-full object-cover rounded-lg cursor-zoom-in hover:opacity-90 transition"
                onClick={() => openAt(i + 1)}
              />
              {i === 4 - videos.length && n > 6 - videos.length && (
                <button
                  onClick={() => openAt(i + 1)}
                  className="absolute inset-0 rounded-lg bg-black/55 text-white font-bold text-sm grid place-items-center"
                >
                  +{n - (6 - videos.length)} ảnh
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {video && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 flex flex-col justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-5"
          onClick={() => setVideo(null)}
        >
          {/* Header với nút đóng */}
          <div className="w-full flex items-center justify-between text-white/90 text-sm max-w-5xl mx-auto">
            <span className="font-semibold text-xs tracking-wide uppercase px-2.5 py-1 rounded-md bg-white/10 text-white/90">
              Video thực tế căn phòng
            </span>
            <button 
              aria-label="Đóng video" 
              className="min-w-11 min-h-11 rounded-sm bg-black/40 hover:bg-black/60 border border-white/25 active:scale-95 text-white flex items-center justify-center transition cursor-pointer"
              onClick={() => setVideo(null)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Vùng hiển thị video: co giãn chuẩn xác theo cả video ngang lẫn video dọc (portrait) */}
          <div 
            className="flex-1 min-h-0 w-full flex flex-col items-center justify-center py-2 overflow-hidden" 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative flex items-center justify-center max-h-[calc(100vh-140px)] max-w-full">
              <video 
                src={video} 
                controls 
                autoPlay 
                playsInline 
                onWaiting={() => setVidTT("tai")}
                onPlaying={() => setVidTT("chay")}
                onCanPlay={() => setVidTT((t) => (t === "loi" ? t : "chay"))}
                onError={() => setVidTT("loi")}
                className="rounded-xl bg-black shadow-2xl object-contain border border-white/10"
                style={{
                  maxHeight: "calc(100vh - 150px)",
                  maxWidth: "min(92vw, 900px)",
                  width: "auto",
                  height: "auto",
                }}
              />
            </div>
            <p role="status" className="mt-3 min-h-5 text-xs text-white/75 text-center">
              {vidTT === "tai" ? "Đang tải video…" : vidTT === "loi" ? "Không phát được video này. Nhắn Zalo, Radar gửi lại video cho bạn." : ""}
            </p>
          </div>

          <div className="h-2" />
        </div>
      )}

      {/* Lightbox: track vuốt toàn màn hình */}
      {open && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col pb-[env(safe-area-inset-bottom)]">
          {/* 2/11 (audit): đệm tai thỏ khi bật viewportFit cover; nút đóng 44px */}
          <div className="flex items-center justify-between px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] text-white text-body-sm">
            <span className="font-semibold">{idx + 1} / {n}</span>
            <button type="button" aria-label="Đóng thư viện ảnh" className="min-w-11 min-h-11 rounded-full bg-black/40 hover:bg-black/60 border border-white/25 text-white grid place-items-center transition" onClick={() => setOpen(false)}>
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 relative min-h-0">
            <div
              ref={box.ref}
              onScroll={box.onScroll}
              className="flex h-full w-full overflow-x-auto snap-x snap-mandatory scrollbar-none overscroll-x-contain"
            >
              {/* 29/10 (Clarity: dead click trên ảnh lightbox): bấm ảnh = ảnh sau (ảnh cuối quay về ảnh đầu), bấm vùng đen quanh ảnh = đóng,
                  như thư viện ảnh quen thuộc. Vuốt không phát click nên không đụng thao tác vuốt trên điện thoại. */}
              {images.map((img, i) => (
                <div
                  key={i}
                  className="w-full h-full shrink-0 snap-center grid place-items-center px-2 pb-2"
                  onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
                >
                  <Img
                    src={img}
                    alt={title}
                    eager={Math.abs(i - idx) <= 1}
                    className={`max-h-full max-w-full object-contain select-none ${n > 1 ? "cursor-pointer" : ""}`}
                    onClick={n > 1 ? () => box.scrollTo(idx >= n - 1 ? 0 : idx + 1) : undefined}
                  />
                </div>
              ))}
            </div>
            {n > 1 && (
              <>
                <button
                  aria-label="Ảnh trước"
                  onClick={() => go(-1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white grid place-items-center max-sm:hidden transition"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  aria-label="Ảnh sau"
                  onClick={() => go(1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/30 text-white grid place-items-center max-sm:hidden transition"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              {/* Nút lướt sang Căn trước / Căn sau nổi ở 2 mép màn hình máy tính (kiểu Mogi) */}
      {effectivePrev && (
        <button
          type="button"
          onClick={() => navigateTo(effectivePrev, "prev")}
          title={`Căn vừa xem: ${effectivePrev.title}`}
          className="hidden 2xl:flex fixed left-5 top-1/2 -translate-y-1/2 z-30 group items-center gap-2 p-2.5 rounded-full bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--ink)] shadow-xl border border-[var(--line)] backdrop-blur transition-all duration-200 hover:scale-105 cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5 text-brand" />
          <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 text-xs font-bold pr-1">
            {effectivePrev.price ? `${effectivePrev.price} · ` : ""}Căn trước
          </span>
        </button>
      )}

      {nextListing && (
        <button
          type="button"
          onClick={() => navigateTo(nextListing, "next")}
          title={`Căn kế tiếp: ${nextListing.title}`}
          className="hidden 2xl:flex fixed right-5 top-1/2 -translate-y-1/2 z-30 group items-center gap-2 p-2.5 rounded-full bg-[var(--surface)] hover:bg-[var(--surface-2)] text-[var(--ink)] shadow-xl border border-[var(--line)] backdrop-blur transition-all duration-200 hover:scale-105 cursor-pointer"
        >
          <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 text-xs font-bold pl-1">
            {nextListing.price ? `${nextListing.price} · ` : ""}Căn tiếp theo
          </span>
          <ChevronRight className="w-5 h-5 text-brand" />
        </button>
      )}

      {/* Toast thông báo chuyển căn khi lướt */}
      {transitionMsg && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="px-5 py-3 rounded-xl bg-[var(--surface)] text-[var(--ink)] font-bold text-sm shadow-2xl border border-[var(--line)] flex items-center gap-2.5 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            <span>{transitionMsg}</span>
          </div>
        </div>
      )}
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
