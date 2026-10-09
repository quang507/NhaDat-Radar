"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useFavCount } from "./FavButton";

export default function NavFav() {
  const n = useFavCount();
  return (
    <Link
      href="/yeu-thich"
      className="relative btn !p-2 text-slate-700 hover:text-red-500 hover:border-red-200 transition-colors"
      aria-label="Tin đã lưu"
      title="Tin đã lưu"
    >
      <Heart className="w-4 h-4" />
      {n > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[0.62rem] font-bold flex items-center justify-center shadow-sm animate-pulse">
          {n > 99 ? "99+" : n}
        </span>
      )}
    </Link>
  );
}
