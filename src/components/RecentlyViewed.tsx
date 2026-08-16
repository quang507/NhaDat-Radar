"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// NN/g #6 "Recognition rather than recall": nhớ tin đã xem + tìm kiếm gần đây trong localStorage (không cần đăng nhập).
// Track: gọi <RecentlyViewedTracker item={...}/> ở trang chi tiết. Hiển thị: <RecentlyViewed/> (search/home) — tối đa 8.
export type Recent = { id: string; title: string; price: string; where: string; img?: string | null; at: number };
const KEY = "radar:recent-listings";
const KEY_Q = "radar:recent-searches";

export function RecentlyViewedTracker({ item }: { item: Omit<Recent, "at"> }) {
  useEffect(() => {
    try {
      const cur: Recent[] = JSON.parse(localStorage.getItem(KEY) || "[]");
      const next = [{ ...item, at: Date.now() }, ...cur.filter((r) => r.id !== item.id)].slice(0, 8);
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch { /* private mode */ }
  }, [item]);
  return null;
}

export function rememberSearch(label: string, href: string) {
  try {
    const cur: { label: string; href: string; at: number }[] = JSON.parse(localStorage.getItem(KEY_Q) || "[]");
    const next = [{ label, href, at: Date.now() }, ...cur.filter((r) => r.href !== href)].slice(0, 6);
    localStorage.setItem(KEY_Q, JSON.stringify(next));
  } catch { /* ignore */ }
}

export function RecentSearches() {
  const [items, setItems] = useState<{ label: string; href: string }[]>([]);
  useEffect(() => { try { setItems(JSON.parse(localStorage.getItem(KEY_Q) || "[]")); } catch { /* ignore */ } }, []);
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs mb-3">
      <span className="text-[var(--ink-soft)]">Tìm gần đây:</span>
      {items.map((s) => (
        <Link key={s.href} href={s.href} className="px-2.5 py-1 rounded-full border border-[var(--line)] hover:border-brand hover:text-brand transition">🕘 {s.label}</Link>
      ))}
      <button className="text-[var(--ink-faint)] underline-offset-2 hover:underline" onClick={() => { localStorage.removeItem(KEY_Q); setItems([]); }}>xoá</button>
    </div>
  );
}

export default function RecentlyViewed({ excludeId }: { excludeId?: string } = {}) {
  const [items, setItems] = useState<Recent[]>([]);
  useEffect(() => { try { setItems((JSON.parse(localStorage.getItem(KEY) || "[]") as Recent[]).filter((r) => r.id !== excludeId)); } catch { /* ignore */ } }, [excludeId]);
  if (!items.length) return null;
  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between mb-2">
        <h2 className="font-bold text-sm">Đã xem gần đây</h2>
        <button className="text-xs text-[var(--ink-faint)] hover:underline" onClick={() => { localStorage.removeItem(KEY); setItems([]); }}>xoá lịch sử</button>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
        {items.map((r) => (
          <Link key={r.id} href={`/listings/${r.id}`} className="card rounded-lg overflow-hidden shrink-0 w-44 hover:border-brand transition">
            <div className="h-24 bg-[var(--surface-2)] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {r.img ? <img src={r.img} alt="" className="w-full h-full object-cover" loading="lazy" /> : null}
            </div>
            <div className="p-2">
              <div className="text-brand font-bold text-sm">{r.price}</div>
              <div className="text-xs line-clamp-2 leading-snug">{r.title}</div>
              <div className="text-[0.68rem] text-[var(--ink-soft)] truncate">{r.where}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
