"use client";

import { useEffect, useRef, useState } from "react";
import { Home, MapPin, BarChart3, PhoneCall, Sparkles } from "lucide-react";

const SECTIONS = [
  { id: "tong-quan", label: "Tổng quan", icon: Home },
  { id: "vi-tri-tien-ich", label: "Vị trí & Tiện ích", icon: MapPin },
  { id: "phan-tich-gia", label: "Phân tích giá", icon: BarChart3 },
  { id: "lien-he", label: "Liên hệ", icon: PhoneCall },
  { id: "tin-lien-quan", label: "Tin tương tự", icon: Sparkles },
];

// 25/10 (NN/g "you are here"): làm nổi mục đang đọc khi cuộn + chỉ hiện mục có thật trên trang
// (tin không có "Tin tương tự" thì trước đây bấm không đi đâu). Dính ngay dưới header; header tự ẩn
// khi cuộn xuống (HeaderCuon) thì thanh này trượt lên sát mép trên - xem .duoi-header ở globals.css.
export default function MobileSectionJumper() {
  const [coMuc, setCoMuc] = useState(SECTIONS.map((s) => s.id));
  const [dangXem, setDangXem] = useState(SECTIONS[0].id);
  const hang = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => !!e);
    setCoMuc(els.map((e) => e.id));
    // mục nào chạm dải 120px..40% chiều cao màn hình tính từ trên = mục đang đọc
    const io = new IntersectionObserver(
      (entries) => {
        const hien = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hien) setDangXem(hien.target.id);
      },
      { rootMargin: "-120px 0px -60% 0px" },
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);

  // giữ chip đang chọn trong khung (cuộn NGANG hàng chip, không đụng cuộn dọc của trang)
  useEffect(() => {
    const row = hang.current, chip = row?.querySelector<HTMLElement>(`[data-muc="${dangXem}"]`);
    if (row && chip) row.scrollTo({ left: chip.offsetLeft - 16, behavior: "smooth" });
  }, [dangXem]);

  const scrollTo = (id: string) => {
    setDangXem(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div ref={hang} className="cuon-ngang duoi-header lg:hidden sticky top-14 z-20 -mx-4 px-4 py-2 bg-[var(--surface)]/95 backdrop-blur-md border-b border-[var(--line)] shadow-xs overflow-x-auto [scrollbar-width:none] overscroll-x-contain">
      <div className="flex items-center gap-2 min-w-max" role="tablist" aria-label="Đi tới mục">
        {SECTIONS.filter((s) => coMuc.includes(s.id)).map(({ id, label, icon: Icon }) => {
          const on = id === dangXem;
          return (
            <button
              key={id}
              data-muc={id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => scrollTo(id)}
              className={`inline-flex items-center gap-1.5 min-h-10 px-3 rounded text-xs font-semibold border transition-colors cursor-pointer ${
                on ? "bg-brand/10 text-brand border-brand/40" : "bg-[var(--surface-2)] text-[var(--ink-soft)] border-[var(--line)]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
