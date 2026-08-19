"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

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
      // Lớp nền bản đồ / vệ tinh — xem ListingMap.tsx để biết vì sao dùng Esri (miễn phí, không token)
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      const nen = token
        ? L.tileLayer(`https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${token}`,
          { tileSize: 512, zoomOffset: -1, attribution: "© Mapbox © OpenStreetMap" })
        : L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 19 });
      const veTinh = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { attribution: "© Esri", maxZoom: 19 });
      // MẶC ĐỊNH là VỆ TINH: với nhà đất, thứ người mua cần thấy đầu tiên là hiện trạng thật
      // quanh miếng đất (hẻm rộng hẹp, nhà san sát hay còn ruộng, có sông/kênh gần không).
      // Bản đồ đường nét vẫn đổi lại được ở nút góc trên bên phải.
      veTinh.addTo(map);
      L.control.layers({ "Vệ tinh": veTinh, "Bản đồ": nen }, {}, { position: "topright" }).addTo(map);
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
