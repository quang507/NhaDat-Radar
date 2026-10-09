"use client";

import { Home, MapPin, BarChart3, PhoneCall, Sparkles } from "lucide-react";

const SECTIONS = [
  { id: "tong-quan", label: "Tổng quan", icon: Home },
  { id: "vi-tri-tien-ich", label: "Vị trí & Tiện ích", icon: MapPin },
  { id: "phan-tich-gia", label: "Phân tích giá", icon: BarChart3 },
  { id: "lien-he", label: "Liên hệ", icon: PhoneCall },
  { id: "tin-lien-quan", label: "Tin tương tự", icon: Sparkles },
];

export default function MobileSectionJumper() {
  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="lg:hidden sticky top-14 z-20 -mx-4 px-4 py-2 bg-[var(--surface)]/95 backdrop-blur-md border-b border-[var(--line)] shadow-xs overflow-x-auto [scrollbar-width:none]">
      <div className="flex items-center gap-2 min-w-max">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => scrollTo(id)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-slate-100 hover:bg-brand/10 hover:text-brand text-slate-700 transition-colors cursor-pointer border border-slate-200/60"
          >
            <Icon className="w-3.5 h-3.5 text-slate-500" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
