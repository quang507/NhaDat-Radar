export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ListingCard from "@/components/ListingCard";
import type { Listing } from "@/lib/types";

const CATS: { t: string; f: (x: Listing) => boolean }[] = [
  { t: "Nhà bán", f: (x) => x.kind === "nha" && x.deal === "ban" },
  { t: "Đất nền bán", f: (x) => x.kind === "dat" && x.deal === "ban" },
  { t: "Căn hộ", f: (x) => x.kind === "can_ho" },
  { t: "Nhà cho thuê", f: (x) => x.kind === "nha" && x.deal === "cho_thue" },
  { t: "Mặt bằng & khác", f: (x) => x.kind === "mat_bang" || x.kind === "khac" },
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ deal?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  let query = supabase.from("listings").select("*").eq("status", "published");
  if (sp.deal === "ban" || sp.deal === "cho_thue") query = query.eq("deal", sp.deal);
  if (sp.q) query = query.ilike("title", `%${sp.q}%`);
  const { data } = await query.order("ai_score", { ascending: false, nullsFirst: false }).limit(150);
  const listings = (data ?? []) as Listing[];

  return (
    <div>
      <section className="py-6">
        <h1 className="prata text-3xl md:text-4xl mb-2">
          Tìm nhà đất bán &amp; cho thuê trên khắp Việt Nam
        </h1>
        <p className="text-[var(--ink-soft)] mb-4 max-w-2xl">
          Tổng hợp tin từ nhiều nguồn, AI chuẩn hoá &amp; chấm điểm độ tin cậy, tự phân loại chính chủ /
          môi giới và cảnh báo giá ảo.
        </p>
        <form action="/" className="flex gap-2 card rounded-2xl p-2 pl-4 shadow-sm max-w-3xl items-center">
          <span className="text-[var(--ink-soft)]">🔍</span>
          <input
            name="q"
            defaultValue={sp.q}
            placeholder="Bạn muốn tìm nhà đất ở đâu? (quận, dự án, từ khoá...)"
            className="flex-1 bg-transparent outline-none text-base py-2"
          />
          <button className="btn btn-primary" type="submit">Tìm kiếm</button>
        </form>
      </section>

      {sp.q || sp.deal ? (
        <div>
          <h2 className="text-xl font-bold mb-3">
            {listings.length} kết quả{sp.q ? ` cho “${sp.q}”` : ""}
          </h2>
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
            {listings.map((x) => (
              <ListingCard key={x.id} x={x} />
            ))}
          </div>
        </div>
      ) : (
        CATS.map((c) => {
          const items = listings.filter(c.f).slice(0, 8);
          if (!items.length) return null;
          return (
            <section key={c.t} className="mt-8">
              <div className="flex items-baseline gap-3 mb-3">
                <h2 className="text-xl font-bold">{c.t}</h2>
                <Link href={`/?q=`} className="text-sm text-brand font-semibold ml-auto">
                  Xem tất cả →
                </Link>
              </div>
              <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]">
                {items.map((x) => (
                  <ListingCard key={x.id} x={x} />
                ))}
              </div>
            </section>
          );
        })
      )}

      {!listings.length ? (
        <p className="text-[var(--ink-soft)] py-10 text-center">
          Chưa có dữ liệu. Chạy <code>schema.sql</code> + <code>node supabase/seed.mjs</code> để nạp 120 tin mẫu.
        </p>
      ) : null}
    </div>
  );
}
