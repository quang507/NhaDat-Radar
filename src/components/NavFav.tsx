"use client";

import Link from "next/link";
import { useFavCount } from "./FavButton";

export default function NavFav() {
  const n = useFavCount();
  return (
    <Link href="/yeu-thich" className="relative btn !px-3" aria-label="Tin đã lưu">
      ♥
      {n > 0 && (
        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[0.65rem] font-bold grid place-items-center">
          {n > 99 ? "99+" : n}
        </span>
      )}
    </Link>
  );
}
