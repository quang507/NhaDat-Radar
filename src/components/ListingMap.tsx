"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

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
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (token) {
        L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${token}`,
          { tileSize: 512, zoomOffset: -1, attribution: "© Mapbox © OpenStreetMap" }).addTo(map);
      } else {
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 19 }).addTo(map);
      }
      const icon = L.divIcon({ className: "price-pin", html: `<div class="pp">📍</div>`, iconSize: [1, 1] });
      L.marker([lat, lng], { icon }).addTo(map).bindPopup(title).openPopup();
    })();
    return () => { cancelled = true; if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; } };
  }, [lat, lng, title]);

  return <div ref={ref} style={{ height: 300 }} className="w-full rounded-xl border border-[var(--line)] z-0" />;
}
