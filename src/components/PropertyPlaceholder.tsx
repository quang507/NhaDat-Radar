"use client";

import { Home, Building2, LandPlot, Store, DoorClosed, Building } from "lucide-react";
import { PROP } from "@/lib/format";

const KIND_CONFIG: Record<string, { bg: string; icon: React.ComponentType<{ className?: string }> }> = {
  nha: { bg: "bg-gradient-to-br from-blue-700 to-indigo-900", icon: Home },
  dat: { bg: "bg-gradient-to-br from-emerald-700 to-teal-900", icon: LandPlot },
  can_ho: { bg: "bg-gradient-to-br from-purple-700 to-violet-950", icon: Building2 },
  mat_bang: { bg: "bg-gradient-to-br from-amber-700 to-amber-950", icon: Store },
  phong_tro: { bg: "bg-gradient-to-br from-rose-700 to-pink-950", icon: DoorClosed },
  khac: { bg: "bg-gradient-to-br from-slate-700 to-slate-900", icon: Building },
};

export default function PropertyPlaceholder({ kind, className = "" }: { kind: string; className?: string }) {
  const cfg = KIND_CONFIG[kind] || KIND_CONFIG.khac;
  const Icon = cfg.icon;
  const label = PROP[kind] || "Bất động sản";

  return (
    <div className={`w-full h-full flex flex-col items-center justify-center gap-2 p-4 text-white relative overflow-hidden select-none ${cfg.bg} ${className}`}>
      {/* Decorative architectural grid lines */}
      <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />
      
      <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-lg relative z-10 transition-transform group-hover:scale-110">
        <Icon className="w-6 h-6 text-white stroke-[2]" />
      </div>
      
      <div className="text-center relative z-10">
        <span className="block text-xs font-bold uppercase tracking-widest text-white/90">
          {label}
        </span>
        <span className="block text-[0.65rem] text-white/60 font-medium mt-0.5">
          Đang cập nhật hình ảnh
        </span>
      </div>
    </div>
  );
}
