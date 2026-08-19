"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { ganLopNen } from "@/lib/map-layers";

// Bản đồ 1 tin (Leaflet + OSM miễn phí, hoặc Mapbox nếu có token)
export default function ListingMap({ lat, lng, title }: { lat: number; lng: number; title: string }) {
  const ref = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current) return;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      const map = L.map(ref.current, { scrollWheelZoom: false }).setView([lat, lng], 15);
      mapRef.current = map;
      ganLopNen(L, map);
      const icon = L.divIcon({ className: "price-pin", html: `<div class="pp">📍</div>`, iconSize: [1, 1] });
      L.marker([lat, lng], { icon }).addTo(map).bindPopup(title).openPopup();
    })();
    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [lat, lng, title]);

  // 300px là quá bé để nhìn khu đất (người dùng 19/8 so với batdongsan - bản đồ của họ chiếm nửa
  // màn hình). 460px + nút ⛶ toàn màn hình: đủ nhìn mà không phải cuộn trang quá dài.
  return <div ref={ref} className="w-full h-[460px] rounded-xl border border-[var(--line)] z-0 bg-[var(--bg)]" />;
}
