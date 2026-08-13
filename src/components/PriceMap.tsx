"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

export type MapPoint = { lat: number; lng: number; label: string; sub?: string };

// Leaflet + OpenStreetMap (miễn phí, không token). Có NEXT_PUBLIC_MAPBOX_TOKEN thì dùng tile Mapbox.
export default function PriceMap({ points, height = 460 }: { points: MapPoint[]; height?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current) return;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      const map = L.map(ref.current, { scrollWheelZoom: false }).setView([16.05, 108.2], 6);
      mapRef.current = map;

      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (token) {
        L.tileLayer(
          `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${token}`,
          { tileSize: 512, zoomOffset: -1, attribution: "© Mapbox © OpenStreetMap" },
        ).addTo(map);
      } else {
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap",
          maxZoom: 19,
        }).addTo(map);
      }

      const bounds: [number, number][] = [];
      for (const p of points) {
        const icon = L.divIcon({
          className: "price-pin",
          html: `<div class="pp">${p.label}</div>`,
          iconSize: [1, 1],
        });
        L.marker([p.lat, p.lng], { icon })
          .addTo(map)
          .bindPopup(`<b>${p.label}</b><br>${p.sub || ""}`);
        bounds.push([p.lat, p.lng]);
      }
      if (bounds.length) map.fitBounds(bounds, { padding: [44, 44], maxZoom: 13 });
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [points]);

  return (
    <div
      ref={ref}
      style={{ height }}
      className="w-full overflow-hidden rounded-2xl border border-[var(--line)] z-0"
    />
  );
}
