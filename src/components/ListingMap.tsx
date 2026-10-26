"use client";

import { useEffect, useRef, useState } from "react";
import { preconnect } from "react-dom";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as BanDo, Marker } from "maplibre-gl";
import { escHtml, shortPrice, fmtPrice, catChu, PROP } from "@/lib/format";
import { taoBanDo, MAY_CHU_BAN_DO } from "@/lib/map-layers";
import { KhungChoBanDo } from "./MapResults";
import { createClient } from "@/lib/supabase/client";

// Bản đồ 1 tin (MapLibre + OpenFreeMap) kèm tính năng hiện BĐS lân cận khi người dùng zoom ra
export default function ListingMap({
  lat,
  lng,
  title,
  deal = "ban",
  currentId,
  priceVnd,
}: {
  lat: number;
  lng: number;
  title: string;
  deal?: "ban" | "cho_thue" | string;
  currentId?: string;
  priceVnd?: number | null;
  kind?: string;
}) {
  preconnect(MAY_CHU_BAN_DO, { crossOrigin: "anonymous" });
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<BanDo | null>(null);
  const [daVe, setDaVe] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(15);
  const [nearbyCount, setNearbyCount] = useState(0);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const nearbyMarkersRef = useRef<Map<string, Marker>>(new Map());
  const fetchTimerRef = useRef<NodeJS.Timeout | null>(null);

  const targetDeal = deal === "cho_thue" ? "cho_thue" : "ban";
  const nhanDeal = targetDeal === "cho_thue" ? "phòng trọ & thuê" : "bán";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!ref.current) return;
      const { ml, map } = await taoBanDo(ref.current, [lat, lng], 15);
      if (cancelled) { map.remove(); return; }
      mapRef.current = map;
      map.once("load", () => {
        if (!cancelled) setDaVe(true);
      });

      // Pin chính: vị trí BĐS đang xem (nổi bật trên cùng)
      const mainEl = document.createElement("button");
      mainEl.type = "button";
      mainEl.className = "ndr-pin ndr-pin-chinh";
      mainEl.innerHTML = "<span>📍 Vị trí</span>";
      const mainPopupHtml = `
        <div class="ndr-popup-tin">
          <span style="font-size:11px;font-weight:700;color:#f59e0b;">📍 BĐS bạn đang xem</span>
          <b>${escHtml(catChu(title, 80))}</b>
          ${priceVnd ? `<div class="ndr-popup-gia"><b>${fmtPrice(priceVnd, deal)}</b></div>` : ""}
        </div>
      `;
      new ml.Marker({ element: mainEl, anchor: "bottom" })
        .setLngLat([lng, lat])
        .setPopup(new ml.Popup({ offset: 12, closeButton: false, maxWidth: "260px", className: "ndr-popup" }).setHTML(mainPopupHtml))
        .addTo(map);

      // Hàm tìm và vẽ BĐS lân cận khi zoom ra (zoom < 15.2)
      const fetchNearby = async () => {
        if (cancelled || !map) return;
        const curZoom = map.getZoom();
        setZoomLevel(curZoom);

        // Khi zoom cận cảnh (> 14.8): giữ bản đồ sạch, chỉ hiện tin chính
        if (curZoom > 14.8) {
          nearbyMarkersRef.current.forEach((m) => m.remove());
          nearbyMarkersRef.current.clear();
          setNearbyCount(0);
          return;
        }

        // Khi zoom ra (<= 14.8): tìm BĐS cùng loại (bán hoặc phòng trọ/thuê) trong khung nhìn
        setLoadingNearby(true);
        try {
          const bounds = map.getBounds();
          const sw = bounds.getSouthWest();
          const ne = bounds.getNorthEast();

          const sb = createClient();
          let q = sb
            .from("listings")
            .select("id,title,price_vnd,deal,kind,lat,lng,images,area_m2")
            .eq("status", "published")
            .eq("deal", targetDeal)
            .gte("lat", sw.lat)
            .lte("lat", ne.lat)
            .gte("lng", sw.lng)
            .lte("lng", ne.lng)
            .limit(30);

          if (currentId) q = q.neq("id", currentId);

          const { data, error } = await q;
          if (cancelled || error || !data) return;

          setNearbyCount(data.length);
          const newIds = new Set(data.map((d) => d.id));

          // Gỡ các pin không còn trong khung nhìn
          nearbyMarkersRef.current.forEach((m, id) => {
            if (!newIds.has(id)) {
              m.remove();
              nearbyMarkersRef.current.delete(id);
            }
          });

          // Thêm pin mới
          data.forEach((it) => {
            if (nearbyMarkersRef.current.has(it.id)) return;
            if (it.lat == null || it.lng == null) return;

            const el = document.createElement("button");
            el.type = "button";
            el.className = `ndr-pin ${it.deal === "cho_thue" ? "ndr-pin-thue" : ""}`;
            el.textContent = shortPrice(it.price_vnd);

            const loaiBds = PROP[it.kind] || (it.deal === "cho_thue" ? "Phòng trọ" : "Nhà đất");
            const popupHtml = `
              <a class="ndr-popup-tin" href="/listings/${encodeURIComponent(it.id)}" target="_blank" rel="noopener">
                ${it.images?.[0] ? `<img src="${escHtml(it.images[0])}" class="w-full h-24 object-cover rounded mb-1 bg-slate-100 dark:bg-slate-800" alt="" loading="lazy" />` : ""}
                <div style="font-size:11px;font-weight:700;color:${it.deal === "cho_thue" ? "#0d9488" : "#047857"};">
                  ${escHtml(loaiBds)}
                </div>
                <b>${escHtml(catChu(it.title, 75))}</b>
                <div class="ndr-popup-gia">
                  <b>${fmtPrice(it.price_vnd, it.deal)} ${it.area_m2 ? `<small style="font-weight:400;color:var(--ink-soft);"> · ${it.area_m2}m²</small>` : ""}</b>
                  <small style="color:rgb(var(--brand-text-rgb));font-weight:700;margin-top:4px;">Xem chi tiết ›</small>
                </div>
              </a>
            `;

            const m = new ml.Marker({ element: el, anchor: "bottom" })
              .setLngLat([it.lng, it.lat])
              .setPopup(new ml.Popup({ offset: 12, closeButton: false, maxWidth: "260px", className: "ndr-popup" }).setHTML(popupHtml))
              .addTo(map);

            nearbyMarkersRef.current.set(it.id, m);
          });
        } catch (e) {
          console.error("ListingMap nearby fetch error:", e);
        } finally {
          if (!cancelled) setLoadingNearby(false);
        }
      };

      const onMapChange = () => {
        if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);
        fetchTimerRef.current = setTimeout(fetchNearby, 250);
      };

      map.on("zoomend", onMapChange);
      map.on("moveend", onMapChange);
    })();

    return () => {
      cancelled = true;
      if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);
      nearbyMarkersRef.current.forEach((m) => m.remove());
      nearbyMarkersRef.current.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [lat, lng, title, deal, currentId, priceVnd, targetDeal]);

  // Hành vi bấm vào thanh trạng thái: nếu đang zoom gần (>= 14.8) thì zoom ra 13.5; nếu đang zoom xa thì bay về vị trí gốc 15
  const handleToggleZoom = () => {
    if (!mapRef.current) return;
    if (zoomLevel >= 14.8) {
      mapRef.current.zoomTo(13.5, { duration: 500 });
    } else {
      mapRef.current.flyTo({ center: [lng, lat], zoom: 15, duration: 500 });
    }
  };

  return (
    <div className="relative w-full h-[460px]">
      <div ref={ref} className="w-full h-full rounded-sm border border-[var(--line)] overflow-hidden z-0 bg-[var(--bg)]" />
      {!daVe && <KhungChoBanDo />}

      {/* Thanh trợ giúp / trạng thái BĐS lân cận góc dưới bên trái */}
      {daVe && (
        <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 pointer-events-auto">
          <button
            type="button"
            onClick={handleToggleZoom}
            aria-label={zoomLevel >= 14.8 ? "Thu nhỏ bản đồ để xem BĐS xung quanh" : "Về lại vị trí tin này"}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[var(--surface)]/95 backdrop-blur-md border border-[var(--line)] shadow-sm hover:border-brand text-xs transition cursor-pointer"
          >
            {loadingNearby ? (
              <span className="text-[var(--ink-soft)] flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />
                Đang tìm BĐS {nhanDeal} quanh đây…
              </span>
            ) : zoomLevel < 14.8 ? (
              <span className="text-[var(--ink)] font-semibold flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                {nearbyCount > 0 ? `${nearbyCount} BĐS ${nhanDeal} lân cận` : `Chưa có thêm BĐS ${nhanDeal} trong vùng này`}
                <span className="text-[10px] text-[var(--ink-faint)] font-normal ml-1">(Bấm để về vị trí cũ)</span>
              </span>
            ) : (
              <span className="text-[var(--ink-soft)] hover:text-brand flex items-center gap-1">
                <span>🔍</span>
                <span>Thu nhỏ xem BĐS {nhanDeal} xung quanh</span>
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
