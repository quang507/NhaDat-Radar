"use client";

import { useState } from "react";
import Link from "next/link";
import PriceMap, { type MapPoint } from "@/components/PriceMap";
import { MapPin, ArrowRight, ExternalLink } from "lucide-react";

export type DistrictRow = {
  district: string;
  med: number;
  n: number;
  lat: number;
  lng: number;
};

function short(v: number): string {
  if (!v) return "-";
  if (v >= 1e9) {
    const t = v / 1e9;
    return (t % 1 ? t.toFixed(1) : String(t)) + "tỷ";
  }
  if (v >= 1e6) return Math.round(v / 1e6) + "tr";
  return Math.round(v / 1e3) + "k";
}

export default function ThongKeView({
  points,
  rows,
  maxMed,
  listingsCount,
  lo,
  hi,
  city,
  deal,
  chartNode,
}: {
  points: MapPoint[];
  rows: DistrictRow[];
  maxMed: number;
  listingsCount: number;
  lo: string;
  hi: string;
  city: string;
  deal: string;
  chartNode: React.ReactNode;
}) {
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);

  return (
    <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5 items-start">
      {/* Cột trái: Bản đồ giá */}
      <div className="card rounded-2xl p-4 border border-slate-200/80 bg-white shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs sm:text-sm text-slate-600 px-1">
          <div>
            <b className="text-slate-900 font-bold">{listingsCount}</b> tin, giá {lo} - {hi} tại {city},{" "}
            {deal === "cho_thue" ? "cho thuê" : "rao bán"}
          </div>
          {selectedDistrict && (
            <button
              onClick={() => setSelectedDistrict(null)}
              className="text-xs text-brand font-semibold hover:underline cursor-pointer"
            >
              Xem toàn cảnh
            </button>
          )}
        </div>

        {points.length ? (
          <PriceMap
            points={points}
            selectedDistrict={selectedDistrict}
            onSelectDistrict={(d) => setSelectedDistrict(d)}
            height={480}
          />
        ) : (
          <div className="h-[480px] grid place-items-center text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
            Chưa có dữ liệu toạ độ cho khu vực này.
          </div>
        )}
      </div>

      {/* Cột phải: Xếp hạng giá theo quận */}
      <div className="card rounded-2xl p-5 border border-slate-200/80 bg-white shadow-xs space-y-4">
        <div>
          <h3 className="font-bold text-base text-slate-900 flex items-center justify-between">
            <span>Xếp hạng giá theo quận</span>
            <span className="text-[0.7rem] font-normal text-slate-400">Bấm quận để phóng to bản đồ</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Giá trung vị (median) phản ánh sát thực tế, loại trừ các tin ảo lệch giá
          </p>
        </div>

        {chartNode}

        {rows.length ? (
          <div className="flex flex-col gap-1 max-h-[360px] overflow-y-auto pr-1">
            {rows.map((r) => {
              const isSelected = selectedDistrict === r.district;
              const tenGon = r.district.replace(/^(Quận|Huyện|Thành phố|TP\.) /, "");
              const searchUrl = `/search?deal=${deal}&province=${encodeURIComponent(city)}&district=${encodeURIComponent(r.district)}`;

              return (
                <div
                  key={r.district}
                  onClick={() => setSelectedDistrict(r.district)}
                  className={`group px-3 py-2 rounded-xl transition-all cursor-pointer border ${
                    isSelected
                      ? "bg-emerald-50/90 border-emerald-300 shadow-xs ring-1 ring-emerald-500/20"
                      : "border-transparent hover:bg-slate-50 hover:border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs mb-1">
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5 truncate" title={r.district}>
                      <MapPin className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-emerald-600" : "text-slate-400 group-hover:text-brand"}`} />
                      <span>{tenGon}</span>
                      <span className="text-slate-400 font-normal">({r.n})</span>
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono font-bold text-slate-900">{short(r.med)}</span>
                      <Link
                        href={searchUrl}
                        onClick={(e) => e.stopPropagation()}
                        className="text-slate-400 hover:text-brand p-0.5 rounded transition-colors"
                        title={`Xem danh sách tin tại ${r.district}`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isSelected
                          ? "bg-emerald-600"
                          : "bg-gradient-to-r from-brand to-emerald-500"
                      }`}
                      style={{ width: `${Math.max(6, (r.med / maxMed) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-slate-400 text-sm py-4 text-center">Không có dữ liệu.</p>
        )}
      </div>
    </div>
  );
}
