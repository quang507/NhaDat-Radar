"use client";

import { useEffect, useRef, useState } from "react";
import { preconnect } from "react-dom";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as BanDo } from "maplibre-gl";
import { escHtml } from "@/lib/format";
import { taoBanDo, ghimGia, MAY_CHU_BAN_DO } from "@/lib/map-layers";
import { KhungChoBanDo } from "./MapResults";

// Bản đồ 1 tin (MapLibre + OpenFreeMap - xem lib/map-layers)
export default function ListingMap({ lat, lng, title }: { lat: number; lng: number; title: string }) {
  preconnect(MAY_CHU_BAN_DO, { crossOrigin: "anonymous" });
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<BanDo | null>(null);
  const [daVe, setDaVe] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!ref.current) return;
      const { ml, map } = await taoBanDo(ref.current, [lat, lng], 15);
      if (cancelled) { map.remove(); return; }
      mapRef.current = map;
      map.once("load", () => setDaVe(true));
      ghimGia(ml, map, [lng, lat], "Vị trí", `<div class="ndr-popup-tin"><b>${escHtml(title)}</b></div>`);
    })();
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; };
  }, [lat, lng, title]);

  // 300px là quá bé để nhìn khu đất (người dùng 19/8 so với batdongsan - bản đồ của họ chiếm nửa
  // màn hình). 460px + nút toàn màn hình: đủ nhìn mà không phải cuộn trang quá dài.
  return (
    <div className="relative w-full h-[460px]">
      <div ref={ref} className="w-full h-full rounded-sm border border-[var(--line)] overflow-hidden z-0 bg-[var(--bg)]" />
      {!daVe && <KhungChoBanDo />}
    </div>
  );
}
