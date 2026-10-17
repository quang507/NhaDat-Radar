"use client";

import { Home, Building2, LandPlot, Store, DoorClosed, Building } from "lucide-react";
import { PROP } from "@/lib/format";

const KIND_CONFIG: Record<string, { img: string; icon: React.ComponentType<{ className?: string }> }> = {
  nha: { img: "/categories/nha-rieng.jpg", icon: Home },
  dat: { img: "/categories/dat-nen.jpg", icon: LandPlot },
  can_ho: { img: "/categories/can-ho.jpg", icon: Building2 },
  mat_bang: { img: "/categories/mat-bang.jpg", icon: Store },
  phong_tro: { img: "/categories/can-ho.jpg", icon: DoorClosed },
  khac: { img: "/categories/nha-rieng.jpg", icon: Building },
};

export default function PropertyPlaceholder({ kind, className = "" }: { kind: string; className?: string }) {
  const cfg = KIND_CONFIG[kind] || KIND_CONFIG.khac;
  const Icon = cfg.icon;
  const label = PROP[kind] || "Bất động sản";

  return (
    <div className={`w-full h-full relative overflow-hidden select-none bg-slate-900 group ${className}`}>
      {/* Background illustration photo */}
      <img
        src={cfg.img}
        alt={label}
        className="absolute inset-0 w-full h-full object-cover brightness-[0.7] group-hover:scale-105 transition-transform duration-500"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-900/30 to-black/20" />
      
      {/* Content overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 p-3 text-white z-10">
        <div className="w-9 h-9 rounded-xl bg-black/45 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-md">
          <Icon className="w-4 h-4 text-white stroke-[2]" />
        </div>
        <div className="text-center drop-shadow-sm">
          <span className="block text-[11px] font-bold uppercase tracking-wider text-white">
            {label}
          </span>
          <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] bg-black/55 backdrop-blur-md text-amber-200 font-medium border border-white/10">
            Ảnh minh hoạ
          </span>
        </div>
      </div>
    </div>
  );
}
