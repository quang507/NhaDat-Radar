"use client";

import { useEffect, useRef, useState } from "react";
import { preconnect } from "react-dom";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as BanDo, Marker } from "maplibre-gl";
import { escHtml, catChu } from "@/lib/format";
import { taoBanDo, ghimGia, MAY_CHU_BAN_DO, type MapLibre } from "@/lib/map-layers";

/** Khung chờ phủ lên bản đồ tới khi vẽ xong lần đầu - trước đây là ô trắng 1-3 giây, nhìn như hỏng. */
export function KhungChoBanDo() {
  return (
    <div className="absolute inset-0 grid place-items-center rounded-sm bg-[var(--surface-2)] animate-pulse pointer-events-none" aria-hidden>
      <span className="text-xs font-semibold text-[var(--ink-faint)]">Đang tải bản đồ…</span>
    </div>
  );
}

export type MapItem = { id: string; lat: number; lng: number; label: string; title: string };

// Bản đồ kết quả tìm kiếm (kiểu batdongsan): mỗi tin 1 pin giá, click mở trang chi tiết.
// 26/10: tạo bản đồ MỘT lần, đổi trang/bộ lọc chỉ thay pin - bản cũ huỷ cả bản đồ rồi tải lại kiểu, font, ô
// bản đồ mỗi lần items đổi (anh Quang: "load lâu thế").
export default function MapResults({ items }: { items: MapItem[] }) {
  preconnect(MAY_CHU_BAN_DO, { crossOrigin: "anonymous" });
  const ref = useRef<HTMLDivElement>(null);
  const [banDo, setBanDo] = useState<{ ml: MapLibre; map: BanDo } | null>(null);
  const [daVe, setDaVe] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let map: BanDo | null = null;
    (async () => {
      if (!ref.current) return;
      const tao = await taoBanDo(ref.current, [16.05, 108.2], 5);
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
    const bounds = new ml.LngLatBounds();
    for (const it of items) {
      const popup = `<a class="ndr-popup-tin" href="/listings/${encodeURIComponent(it.id)}"><b>${escHtml(catChu(it.title, 80))}</b><span>Xem chi tiết ›</span></a>`;
      pins.push(ghimGia(ml, map, [it.lng, it.lat], it.label, popup));
      bounds.extend([it.lng, it.lat]);
    }
    if (items.length) map.fitBounds(bounds, { padding: 48, maxZoom: 14, duration: 0 });
    return () => pins.forEach((p) => p.remove());
  }, [banDo, items]);

  return (
    <div className="relative w-full h-full">
      <div ref={ref} className="w-full h-full rounded-sm border border-[var(--line)] overflow-hidden z-0" />
      {!daVe && <KhungChoBanDo />}
    </div>
  );
}
