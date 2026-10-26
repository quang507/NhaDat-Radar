"use client";

import { useEffect, useRef } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as BanDo } from "maplibre-gl";
import { escHtml, catChu } from "@/lib/format";
import { taoBanDo, ghimGia } from "@/lib/map-layers";

export type MapItem = { id: string; lat: number; lng: number; label: string; title: string };

// Bản đồ kết quả tìm kiếm (kiểu batdongsan): mỗi tin 1 pin giá, click mở trang chi tiết.
export default function MapResults({ items }: { items: MapItem[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<BanDo | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!ref.current) return;
      const { ml, map } = await taoBanDo(ref.current, [16.05, 108.2], 5);
      if (cancelled) { map.remove(); return; }
      mapRef.current = map;
      const bounds = new ml.LngLatBounds();
      for (const it of items) {
        const popup = `<a class="ndr-popup-tin" href="/listings/${encodeURIComponent(it.id)}"><b>${escHtml(catChu(it.title, 80))}</b><span>Xem chi tiết ›</span></a>`;
        ghimGia(ml, map, [it.lng, it.lat], it.label, popup);
        bounds.extend([it.lng, it.lat]);
      }
      if (items.length) map.fitBounds(bounds, { padding: 48, maxZoom: 14, duration: 0 });
    })();
    return () => { cancelled = true; mapRef.current?.remove(); mapRef.current = null; };
  }, [items]);

  return <div ref={ref} className="w-full h-full rounded-sm border border-[var(--line)] overflow-hidden z-0" />;
}
