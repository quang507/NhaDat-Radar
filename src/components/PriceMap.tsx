"use client";

import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as BanDo, Marker } from "maplibre-gl";
import { escHtml } from "@/lib/format";
import { taoBanDo, ghimGia } from "@/lib/map-layers";

export type MapPoint = {
  lat: number;
  lng: number;
  label: string;
  sub?: string;
  district?: string;
  searchUrl?: string;
};

// MapLibre + OpenFreeMap (lib/map-layers). Hỗ trợ zoom trực tiếp khi click quận từ danh sách xếp hạng.
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
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<BanDo | null>(null);
  const markersRef = useRef<Map<string, Marker>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!ref.current) return;
      markersRef.current.clear();
      const { ml, map } = await taoBanDo(ref.current, [16.05, 108.2], 6);
      if (cancelled) { map.remove(); return; }
      mapRef.current = map;

      const bounds = new ml.LngLatBounds();
      for (const p of points) {
        const searchLink = p.searchUrl ? `<a href="${escHtml(p.searchUrl)}">Xem danh sách tin ›</a>` : "";
        const popupHtml = `<div class="ndr-popup-gia"><b>${escHtml(p.label)}</b><small>${escHtml(p.sub)}</small>${searchLink}</div>`;
        const marker = ghimGia(ml, map, [p.lng, p.lat], p.label, popupHtml);
        if (p.district) {
          markersRef.current.set(p.district, marker);
          marker.getElement().addEventListener("click", () => onSelectDistrict?.(p.district!));
        }
        bounds.extend([p.lng, p.lat]);
      }
      if (points.length) map.fitBounds(bounds, { padding: 48, maxZoom: 13, duration: 0 });
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [points, onSelectDistrict]);

  // Zoom và mở popup khi selectedDistrict thay đổi từ danh sách bên ngoài
  useEffect(() => {
    const map = mapRef.current;
    if (!selectedDistrict || !map) return;
    const marker = markersRef.current.get(selectedDistrict);
    if (!marker) return;
    map.flyTo({ center: marker.getLngLat(), zoom: 13, duration: 800 });
    const popup = marker.getPopup();
    if (popup && !popup.isOpen()) marker.togglePopup();
  }, [selectedDistrict]);

  return (
    <div
      ref={ref}
      style={{ height }}
      className="w-full overflow-hidden rounded-sm border border-[var(--line)] shadow-xs z-0"
    />
  );
}
