"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const KEY = "ndr_favs";

// Đồng bộ DB (bảng favorites) khi đã đăng nhập - fire-and-forget, localStorage vẫn là nguồn chính.
async function syncDb(id: string, on: boolean) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (on) await supabase.from("favorites").upsert({ user_id: user.id, listing_id: id });
    else await supabase.from("favorites").delete().eq("user_id", user.id).eq("listing_id", id);
  } catch { /* offline/chưa đăng nhập - bỏ qua */ }
}

// Kéo favorites từ DB về máy mới (gộp 2 chiều) - gọi ở trang /yeu-thich.
export async function pullDbFavs(): Promise<void> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase.from("favorites").select("listing_id").eq("user_id", user.id);
    const dbIds = (data ?? []).map((r) => r.listing_id as string);
    const local = getFavs();
    const merged = [...new Set([...local, ...dbIds])];
    if (merged.length !== local.length) setFavs(merged);
    // đẩy các id local chưa có trên DB
    const missing = local.filter((i) => !dbIds.includes(i));
    if (missing.length) {
      await supabase.from("favorites").upsert(missing.map((listing_id) => ({ user_id: user.id, listing_id })));
    }
  } catch { /* bỏ qua */ }
}

export function getFavs(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function setFavs(ids: string[]) {
  localStorage.setItem(KEY, JSON.stringify(ids));
  window.dispatchEvent(new CustomEvent("ndr:favs"));
}

export function useFavCount(): number {
  const [n, setN] = useState(0);
  useEffect(() => {
    const upd = () => setN(getFavs().length);
    upd();
    window.addEventListener("ndr:favs", upd);
    window.addEventListener("storage", upd);
    return () => {
      window.removeEventListener("ndr:favs", upd);
      window.removeEventListener("storage", upd);
    };
  }, []);
  return n;
}

// Trái tim lưu tin (localStorage, không cần đăng nhập) - dùng đè lên ảnh ListingCard.
export default function FavButton({ id, className = "" }: { id: string; className?: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const upd = () => setOn(getFavs().includes(id));
    upd();
    window.addEventListener("ndr:favs", upd);
    return () => window.removeEventListener("ndr:favs", upd);
  }, [id]);

  return (
    <button
      type="button"
      aria-label={on ? "Bỏ lưu tin" : "Lưu tin"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const cur = getFavs();
        setFavs(on ? cur.filter((x) => x !== id) : [...cur, id]);
        void syncDb(id, !on);
      }}
      className={`w-8 h-8 rounded-full grid place-items-center text-base transition shadow
        ${on ? "bg-red-500 text-white" : "bg-white/90 text-[#333] hover:bg-white"} ${className}`}
    >
      {on ? "♥" : "♡"}
    </button>
  );
}
