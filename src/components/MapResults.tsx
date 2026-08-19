"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { ganLopNen } from "@/lib/map-layers";

export type MapItem = { id: string; lat: number; lng: number; label: string; title: string };

// Bản đồ kết quả tìm kiếm (kiểu batdongsan): mỗi tin 1 pin giá, click mở trang chi tiết.
export default function MapResults({ items }: { items: MapItem[] }) {
  const ref = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current) return;
      if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
      const map = L.map(ref.current, { scrollWheelZoom: false }).setView([16.05, 108.2], 5);
      mapRef.current = map;
      ganLopNen(L, map);
      const bounds: [number, number][] = [];
      for (const it of items) {
        const icon = L.divIcon({ className: "price-pin", html: `<div class="pp">${it.label}</div>`, iconSize: [1, 1] });
        const popup = `<div style="font-weight:600;margin-bottom:4px;max-width:200px">${it.title.replace(/</g, "&lt;").slice(0, 80)}</div><a href="/listings/${it.id}" style="color:#b23a1e;font-weight:600">Xem chi tiết ›</a>`;
        L.marker([it.lat, it.lng], { icon }).addTo(map).bindPopup(popup);
        bounds.push([it.lat, it.lng]);
      }
      if (bounds.length) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    })();
    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [items]);

  return <div ref={ref} className="w-full h-full rounded-lg border border-[var(--line)] z-0" />;
}
