"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import ListingCard from "@/components/ListingCard";
import { getFavs } from "@/components/FavButton";
import type { Listing } from "@/lib/types";

// Trang tin đã lưu ♥ — id lưu ở localStorage, không cần đăng nhập.
export default function FavouritesPage() {
  const [items, setItems] = useState<Listing[] | null>(null);

  useEffect(() => {
    const load = async () => {
      const ids = getFavs();
      if (!ids.length) return setItems([]);
      const supabase = createClient();
      const { data } = await supabase
        .from("listings").select("*").in("id", ids).eq("status", "published");
      const order = new Map(ids.map((id, i) => [id, i]));
      setItems(((data ?? []) as Listing[]).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)));
    };
    load();
    window.addEventListener("ndr:favs", load);
    return () => window.removeEventListener("ndr:favs", load);
  }, []);

  return (
    <div>
      <h1 className="prata text-2xl mb-1">Tin đã lưu</h1>
      <p className="text-[var(--ink-soft)] text-sm mb-5">
        Bấm ♥ trên bất kỳ tin nào để lưu lại đây và so sánh sau.
      </p>
      {items === null ? (
        <p className="text-[var(--ink-soft)] py-10 text-center">Đang tải…</p>
      ) : items.length ? (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]">
          {items.map((x) => <ListingCard key={x.id} x={x} />)}
        </div>
      ) : (
        <div className="card rounded-2xl p-10 text-center">
          <div className="text-4xl mb-3">♡</div>
          <h3 className="font-bold text-lg mb-1">Chưa có tin nào được lưu</h3>
          <p className="text-[var(--ink-soft)] text-sm mb-4">Khám phá bất động sản và bấm ♥ để lưu tin bạn thích.</p>
          <Link href="/search" className="btn btn-primary inline-block">Tìm kiếm ngay</Link>
        </div>
      )}
    </div>
  );
}
