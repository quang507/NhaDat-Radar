"use client";

import { useEffect, useRef, useState } from "react";
import { preconnect } from "react-dom";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as BanDo } from "maplibre-gl";
import { Search, RotateCcw } from "lucide-react";
import { escHtml, shortPrice, fmtPrice, catChu, PROP } from "@/lib/format";
import { taoBanDo, lopGomCum, MAY_CHU_BAN_DO, type DiemBanDo } from "@/lib/map-layers";
import { KhungChoBanDo } from "./MapResults";
import { createClient } from "@/lib/supabase/client";
import { cheTinDocQuyen } from "@/lib/doc-quyen";

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
  const [nearbyCount, setNearbyCount] = useState(0);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const nearbyRef = useRef<Map<string, DiemBanDo>>(new Map());
  const fetchTimerRef = useRef<NodeJS.Timeout | null>(null);
  // 27/10 (anh Quang): đã thu nhỏ tìm lân cận 1 lần thì các pin GIỮ LẠI khi phóng to về, kéo sang vùng khác thì
  // tải thêm pin vùng đó (cộng dồn, không xoá vùng cũ). Trước lần thu nhỏ đầu tiên bản đồ vẫn chỉ có pin chính.
  const [daTim, setDaTim] = useState(false);

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
      mainEl.textContent = "Vị trí";
      const mainPopupHtml = `
        <div class="ndr-popup-tin">
          <span style="font-size:11px;font-weight:700;color:#f59e0b;">BĐS bạn đang xem</span>
          <b>${escHtml(catChu(title, 80))}</b>
          ${priceVnd ? `<div class="ndr-popup-gia"><b>${fmtPrice(priceVnd, deal)}</b></div>` : ""}
        </div>
      `;
      new ml.Marker({ element: mainEl, anchor: "bottom" })
        .setLngLat([lng, lat])
        .setPopup(new ml.Popup({ offset: 12, closeButton: false, maxWidth: "260px", className: "ndr-popup" }).setHTML(mainPopupHtml))
        .addTo(map);

      // 27/10: tin lân cận vẽ qua lớp gom cụm (bong bóng "N phòng" kiểu HiFriendz, bấm để tách) - lib/map-layers
      const lop = lopGomCum(ml, map, targetDeal === "cho_thue" ? "phòng" : "tin");

      // Tìm và vẽ BĐS lân cận: bật từ lần đầu thu nhỏ (zoom <= 14.8), sau đó mọi lần kéo/zoom đều tải thêm
      let daBat = false;
      const fetchNearby = async () => {
        if (cancelled || !map) return;
        const curZoom = map.getZoom();

        // Chưa thu nhỏ lần nào: giữ bản đồ sạch, chỉ hiện tin chính
        if (!daBat && curZoom > 14.8) return;
        daBat = true;
        setDaTim(true);

        // Tìm BĐS cùng loại (bán hoặc phòng trọ/thuê) trong khung nhìn hiện tại
        setLoadingNearby(true);
        try {
          const bounds = map.getBounds();
          const sw = bounds.getSouthWest();
          const ne = bounds.getNorthEast();

          const sb = createClient();
          let q = sb
            .from("listings")
            .select("id,source,source_site,title,price_vnd,deal,kind,lat,lng,images,area_m2")
            .eq("status", "published")
            .eq("deal", targetDeal)
            .gte("lat", sw.lat)
            .lte("lat", ne.lat)
            .gte("lng", sw.lng)
            .lte("lng", ne.lng)
            .order("ai_score", { ascending: false, nullsFirst: false })
            .limit(30);

          if (currentId) q = q.neq("id", currentId);

          const { data, error } = await q;
          if (cancelled || error || !data) return;

          // CLAUDE.md mục 4: che SĐT trên tin độc quyền (FB, Zalo, rổ hàng) trước khi đưa lên UI
          type RawItem = {
            id: string;
            source?: string | null;
            source_site?: string | null;
            title?: string | null;
            price_vnd: number | null;
            deal?: string;
            kind: string;
            lat: number | null;
            lng: number | null;
            images?: string[] | null;
            area_m2?: number | null;
          };
          const items = (data as unknown as RawItem[]).map(cheTinDocQuyen);

          // Cộng dồn điểm - vùng cũ GIỮ NGUYÊN khi kéo bản đồ
          for (const it of items) {
            if (nearbyRef.current.has(it.id) || it.lat == null || it.lng == null) continue;
            const loaiBds = PROP[it.kind] || (it.deal === "cho_thue" ? "Phòng trọ" : "Nhà đất");
            const imgUrl = it.images?.[0] || null;
            const popupHtml = `
              <a class="ndr-popup-tin" href="/listings/${encodeURIComponent(it.id)}" target="_blank" rel="noopener">
                ${imgUrl ? `<img src="${escHtml(imgUrl)}" referrerpolicy="no-referrer" class="w-full h-24 object-cover rounded mb-1 bg-slate-100 dark:bg-slate-800" alt="" loading="lazy" />` : ""}
                <div style="font-size:11px;font-weight:700;color:#047857;">
                  ${escHtml(loaiBds)}
                </div>
                <b>${escHtml(catChu(it.title || "", 75))}</b>
                <div class="ndr-popup-gia">
                  <b>${fmtPrice(it.price_vnd, it.deal)} ${it.area_m2 ? `<small style="font-weight:400;color:var(--ink-soft);"> · ${it.area_m2}m²</small>` : ""}</b>
                  <small style="color:rgb(var(--brand-text-rgb));font-weight:700;margin-top:4px;">Xem chi tiết ›</small>
                </div>
              </a>
            `;
            nearbyRef.current.set(it.id, {
              id: it.id, lat: it.lat, lng: it.lng, nhan: shortPrice(it.price_vnd),
              tieuDe: catChu(it.title || "", 70), popup: popupHtml,
            });
          }

          // Trần 300 điểm: kéo khắp thành phố thì bỏ bớt điểm nạp sớm nhất (Map giữ thứ tự thêm vào), trừ vùng đang xem
          const dangXem = new Set(items.map((d) => d.id));
          for (const id of nearbyRef.current.keys()) {
            if (nearbyRef.current.size <= 300) break;
            if (!dangXem.has(id)) nearbyRef.current.delete(id);
          }
          lop.datDiem([...nearbyRef.current.values()]);
          setNearbyCount(nearbyRef.current.size);
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
      nearbyRef.current.clear();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [lat, lng, title, deal, currentId, priceVnd, targetDeal]);

  // Bấm thanh trạng thái: chưa tìm lân cận thì thu nhỏ về 13.5 để tìm; đã tìm rồi thì bay về vị trí tin (pin vẫn giữ)
  const handleToggleZoom = () => {
    if (!mapRef.current) return;
    if (!daTim) {
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
            aria-label={daTim ? "Về lại vị trí tin này" : `Thu nhỏ bản đồ để xem BĐS ${nhanDeal} xung quanh`}
            className="min-h-11 flex items-center gap-2 px-3 py-2 rounded bg-[var(--surface)] border border-[var(--line)] shadow-sm hover:border-brand text-xs text-[var(--ink)] font-medium transition cursor-pointer select-none"
          >
            {loadingNearby ? (
              <span className="text-[var(--ink-soft)] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block" />
                <span>Đang tìm BĐS {nhanDeal} quanh đây…</span>
              </span>
            ) : daTim ? (
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                <span className="font-semibold">
                  {nearbyCount > 0 ? `${nearbyCount} BĐS ${nhanDeal} trên bản đồ` : `Chưa có thêm BĐS ${nhanDeal} trong vùng này`}
                </span>
                <span className="text-[var(--ink-soft)] flex items-center gap-1 ml-1 border-l border-[var(--line)] pl-2">
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Vị trí cũ</span>
                </span>
              </span>
            ) : (
              <span className="text-[var(--ink-soft)] hover:text-brand flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-brand" />
                <span>Thu nhỏ xem BĐS {nhanDeal} xung quanh</span>
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
