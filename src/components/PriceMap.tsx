"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { escHtml } from "@/lib/format";

export type MapPoint = {
  lat: number;
  lng: number;
  label: string;
  sub?: string;
  district?: string;
  searchUrl?: string;
};

// Leaflet + OpenStreetMap. Hỗ trợ zoom trực tiếp khi click quận từ danh sách xếp hạng.
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<Map<string, any>>(new Map());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !ref.current) return;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      markersRef.current.clear();

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
          html: `<div class="pp">${escHtml(p.label)}</div>`,
          iconSize: [1, 1],
        });

        const searchLink = p.searchUrl
          ? `<div style="margin-top:6px;padding-top:4px;border-top:1px solid #e2e8f0"><a href="${escHtml(p.searchUrl)}" style="color:#059669;font-weight:700;font-size:12px;text-decoration:none">Xem danh sách tin ›</a></div>`
          : "";

        const popupHtml = `
          <div style="font-family:system-ui,sans-serif;padding:2px">
            <div style="font-size:15px;font-weight:800;color:#0f172a">${escHtml(p.label)}</div>
            <div style="font-size:12px;color:#64748b;margin-top:2px">${escHtml(p.sub)}</div>
            ${searchLink}
          </div>
        `;

        const marker = L.marker([p.lat, p.lng], { icon })
          .addTo(map)
          .bindPopup(popupHtml);

        if (p.district) {
          markersRef.current.set(p.district, marker);
          marker.on("click", () => {
            onSelectDistrict?.(p.district!);
          });
        }

        bounds.push([p.lat, p.lng]);
      }

      if (bounds.length) {
        map.fitBounds(bounds, { padding: [44, 44], maxZoom: 13 });
      }
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [points, onSelectDistrict]);

  // Zoom và mở popup khi selectedDistrict thay đổi từ danh sách bên ngoài
  useEffect(() => {
    if (!selectedDistrict || !mapRef.current) return;
    const marker = markersRef.current.get(selectedDistrict);
    if (marker) {
      const ll = marker.getLatLng();
      mapRef.current.flyTo([ll.lat, ll.lng], 13, { duration: 0.8 });
      marker.openPopup();
    }
  }, [selectedDistrict]);

  return (
    <div
      ref={ref}
      style={{ height }}
      className="w-full overflow-hidden rounded-xl border border-slate-200 shadow-xs z-0"
    />
  );
}
