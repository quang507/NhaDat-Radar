"use client";

import { useEffect, useState } from "react";

const KEY = "ndr_favs";

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

// Trái tim lưu tin (localStorage, không cần đăng nhập) — dùng đè lên ảnh ListingCard.
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
      }}
      className={`w-8 h-8 rounded-full grid place-items-center text-base transition shadow
        ${on ? "bg-red-500 text-white" : "bg-white/90 text-[#333] hover:bg-white"} ${className}`}
    >
      {on ? "♥" : "♡"}
    </button>
  );
}
