import { fmtPrice, shortPrice } from "./format";
import { laTinDocQuyen, cheSoVanBan } from "./doc-quyen";
import type { Listing } from "./types";

// Tách khỏi components/MapResults ("use client"): trang chủ là Server Component, gọi hàm của file client sẽ lỗi.
export type MapItem = { id: string; lat: number; lng: number; label: string; title: string; img?: string | null; gia?: string };

/** Tin -> pin bản đồ (trang chủ + trang tìm kiếm). 27/10: popup kèm ảnh đầu + giá/diện tích (anh Quang hỏi thẻ có ảnh được không). */
export const tinLenBanDo = (x: Listing): MapItem[] =>
  x.lat == null || x.lng == null ? [] : [{
    id: x.id, lat: x.lat, lng: x.lng, label: shortPrice(x.price_vnd),
    title: laTinDocQuyen(x) ? cheSoVanBan(x.title) : x.title, img: x.images?.[0] || null,
    gia: [fmtPrice(x.price_vnd, x.deal), x.area_m2 ? `${x.area_m2}m²` : ""].filter(Boolean).join(" · "),
  }];
