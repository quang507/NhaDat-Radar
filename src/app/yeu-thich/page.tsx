"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { LISTING_CARD_COLS } from "@/lib/cols";
import ListingCard from "@/components/ListingCard";
import { getFavs, pullDbFavs } from "@/components/FavButton";
import { fmtPrice, fmtPpm2, PROP } from "@/lib/format";
import type { Listing } from "@/lib/types";

// Trang tin đã lưu ♥ - id lưu ở localStorage, không cần đăng nhập.
export default function FavouritesPage() {
  const [items, setItems] = useState<Listing[] | null>(null);
  const [compare, setCompare] = useState(false);

  useEffect(() => {
    const load = async () => {
      // lọc id hỏng TRƯỚC khi query: 1 giá trị không phải UUID trong localStorage làm
      // Postgres 22P02 cho CẢ câu .in() -> trang hiện "Chưa có tin nào" dù đã lưu 20 tin
      const ids = getFavs().filter((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
      if (!ids.length) return setItems([]);
      const supabase = createClient();
      const { data } = await supabase
        .from("listings").select(LISTING_CARD_COLS).in("id", ids).eq("status", "published");
      const order = new Map(ids.map((id, i) => [id, i]));
      setItems(((data ?? []) as Listing[]).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)));
    };
    pullDbFavs().finally(load); // gộp tin đã lưu trên DB (nếu đăng nhập) rồi hiển thị
    window.addEventListener("ndr:favs", load);
    return () => window.removeEventListener("ndr:favs", load);
  }, []);

  return (
    <div>
      <div className="flex items-end justify-between flex-wrap gap-3 mb-5">
        <div>
          <h1 className="prata text-2xl mb-1">Tin đã lưu</h1>
          <p className="text-[var(--ink-soft)] text-sm">
            Bấm ♥ trên bất kỳ tin nào để lưu lại đây và so sánh cạnh nhau.
          </p>
        </div>
        {!!items?.length && items.length >= 2 && (
          <button className={`btn text-sm ${compare ? "!border-brand !text-brand" : ""}`} onClick={() => setCompare((v) => !v)}>
            {compare ? "▦ Xem dạng thẻ" : "⚖ So sánh"}
          </button>
        )}
      </div>

      {items === null ? (
        <p className="text-[var(--ink-soft)] py-10 text-center">Đang tải…</p>
      ) : items.length ? (
        compare && items.length >= 2 ? (
          <CompareTable items={items} />
        ) : (
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]">
            {items.map((x) => <ListingCard key={x.id} x={x} />)}
          </div>
        )
      ) : (
        <div className="card rounded-lg p-10 text-center">
          <div className="text-4xl mb-3">♡</div>
          <h3 className="font-bold text-lg mb-1">Chưa có tin nào được lưu</h3>
          <p className="text-[var(--ink-soft)] text-sm mb-4">Khám phá bất động sản và bấm ♥ để lưu tin bạn thích.</p>
          <Link href="/search" className="btn btn-primary inline-block">Tìm kiếm ngay</Link>
        </div>
      )}
    </div>
  );
}

// Bảng so sánh cạnh nhau: mỗi tin 1 cột, mỗi thuộc tính 1 hàng. Ô "tốt nhất" được tô đậm.
function CompareTable({ items }: { items: Listing[] }) {
  const list = items.slice(0, 4); // giới hạn 4 cột cho dễ đọc
  const ppm2 = (x: Listing) => (x.price_per_m2 ? Number(x.price_per_m2) : null);

  // giá trị "tốt nhất" để highlight
  const prices = list.map((x) => x.price_vnd ?? Infinity);
  const minPrice = Math.min(...prices);
  const ppm2s = list.map((x) => ppm2(x) ?? Infinity);
  const minPpm2 = Math.min(...ppm2s);
  const areas = list.map((x) => Number(x.area_m2) || 0);
  const maxArea = Math.max(...areas);
  const scores = list.map((x) => x.ai_score ?? 0);
  const maxScore = Math.max(...scores);

  const rows: { label: string; cell: (x: Listing) => React.ReactNode; best?: (x: Listing) => boolean }[] = [
    { label: "Giá", cell: (x) => fmtPrice(x.price_vnd, x.deal), best: (x) => (x.price_vnd ?? Infinity) === minPrice && minPrice !== Infinity },
    { label: "Giá/m²", cell: (x) => { const v = ppm2(x); return v == null ? "-" : fmtPpm2(v); }, best: (x) => (ppm2(x) ?? Infinity) === minPpm2 && minPpm2 !== Infinity },
    { label: "Diện tích", cell: (x) => (x.area_m2 ? `${x.area_m2} m²` : "-"), best: (x) => (Number(x.area_m2) || 0) === maxArea && maxArea > 0 },
    { label: "Phòng ngủ", cell: (x) => x.bedrooms ?? "-" },
    { label: "Phòng tắm", cell: (x) => x.bathrooms ?? "-" },
    { label: "Loại", cell: (x) => PROP[x.kind] },
    { label: "Khu vực", cell: (x) => [x.district, x.province].filter(Boolean).join(", ") || "-" },
    { label: "Pháp lý", cell: (x) => x.legal_status || "-" },
    { label: "Điểm AI", cell: (x) => (x.ai_score ? `★ ${x.ai_score}/100` : "-"), best: (x) => (x.ai_score ?? 0) === maxScore && maxScore > 0 },
  ];

  return (
    <div className="overflow-x-auto -mx-4 px-4">
      <table className="w-full border-separate border-spacing-0 text-sm min-w-[520px]">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-[var(--bg)] text-left align-bottom p-2 w-24"></th>
            {list.map((x) => (
              <th key={x.id} className="p-2 align-bottom min-w-[150px]">
                <Link href={`/listings/${x.id}`} className="block font-semibold text-left leading-snug line-clamp-2 hover:text-brand">
                  {x.title}
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <td className="sticky left-0 z-10 bg-[var(--bg)] text-[var(--ink-soft)] font-semibold p-2 border-t border-[var(--line)]">{r.label}</td>
              {list.map((x) => {
                const best = r.best?.(x);
                return (
                  <td key={x.id} className={`p-2 border-t border-[var(--line)] ${best ? "font-bold text-brand" : ""}`}>
                    {r.cell(x)}{best ? " ✓" : ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-[var(--ink-faint)] mt-3">✓ = giá trị tốt nhất trong nhóm (giá thấp nhất, diện tích lớn nhất, điểm AI cao nhất). So sánh tối đa 4 tin.</p>
    </div>
  );
}
