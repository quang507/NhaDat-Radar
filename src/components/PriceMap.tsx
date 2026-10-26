"use client";

import { useEffect, useRef, useState } from "react";
import { preconnect } from "react-dom";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as BanDo, Marker } from "maplibre-gl";
import { escHtml } from "@/lib/format";
import { taoBanDo, ghimGia, MAY_CHU_BAN_DO, type MapLibre } from "@/lib/map-layers";
import { KhungChoBanDo } from "./MapResults";

export type MapPoint = {
  lat: number;
  lng: number;
  label: string;
  sub?: string;
  district?: string;
  searchUrl?: string;
};

// MapLibre + OpenFreeMap (lib/map-layers). Hỗ trợ zoom trực tiếp khi click quận từ danh sách xếp hạng.
// Bản đồ tạo MỘT lần; đổi thành phố / mua-thuê chỉ thay pin (xem MapResults).
export default function PriceMap({
  points,
  selectedDistrict,
  onSelectDistrict,
  height = 460,
}: {
  points: MapPoint[];
  selectedDistrict?: string | null;
  onSelectDistrict?: (district: string) => void;
  height?: number;
}) {
  preconnect(MAY_CHU_BAN_DO, { crossOrigin: "anonymous" });
  const ref = useRef<HTMLDivElement>(null);
  const [banDo, setBanDo] = useState<{ ml: MapLibre; map: BanDo } | null>(null);
  const [daVe, setDaVe] = useState(false);
  const markersRef = useRef<Map<string, Marker>>(new Map());

  useEffect(() => {
    let cancelled = false;
    let map: BanDo | null = null;
    (async () => {
      if (!ref.current) return;
      const tao = await taoBanDo(ref.current, [16.05, 108.2], 6);
      map = tao.map;
      if (cancelled) { map.remove(); return; }
      map.once("load", () => setDaVe(true));
      setBanDo(tao);
    })();
    return () => { cancelled = true; map?.remove(); };
  }, []);

  useEffect(() => {
    if (!banDo) return;
    const { ml, map } = banDo;
    const pins: Marker[] = [];
    markersRef.current.clear();
    const bounds = new ml.LngLatBounds();
    for (const p of points) {
      const searchLink = p.searchUrl ? `<a href="${escHtml(p.searchUrl)}">Xem danh sách tin ›</a>` : "";
      const popupHtml = `<div class="ndr-popup-gia"><b>${escHtml(p.label)}</b><small>${escHtml(p.sub)}</small>${searchLink}</div>`;
      const marker = ghimGia(ml, map, [p.lng, p.lat], p.label, popupHtml);
      pins.push(marker);
      if (p.district) {
        markersRef.current.set(p.district, marker);
        marker.getElement().addEventListener("click", () => onSelectDistrict?.(p.district!));
      }
      bounds.extend([p.lng, p.lat]);
    }
    if (points.length) map.fitBounds(bounds, { padding: 48, maxZoom: 13, duration: 0 });
    return () => pins.forEach((m) => m.remove());
  }, [banDo, points, onSelectDistrict]);

  // Zoom và mở popup khi selectedDistrict thay đổi từ danh sách bên ngoài
  useEffect(() => {
    if (!selectedDistrict || !banDo) return;
    const marker = markersRef.current.get(selectedDistrict);
    if (!marker) return;
    banDo.map.flyTo({ center: marker.getLngLat(), zoom: 13, duration: 800 });
    const popup = marker.getPopup();
    if (popup && !popup.isOpen()) marker.togglePopup();
  }, [selectedDistrict, banDo]);

  return (
    <div className="relative w-full" style={{ height }}>
      <div ref={ref} className="w-full h-full overflow-hidden rounded-sm border border-[var(--line)] shadow-xs z-0" />
      {!daVe && <KhungChoBanDo />}
    </div>
  );
}
