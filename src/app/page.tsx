export const dynamic = "force-dynamic";

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ListingCard from "@/components/ListingCard";
import MapResults, { type MapItem } from "@/components/MapResults";
import { fmtPrice, PROP } from "@/lib/format";
import type { Listing, Project } from "@/lib/types";

function shortPrice(v: number | null): string {
  if (!v) return "TL";
  if (v >= 1e9) { const t = v / 1e9; return (t % 1 ? t.toFixed(1) : String(t)) + "tỷ"; }
  return Math.round(v / 1e6) + "tr";
}

const CATS: { t: string; f: (x: Listing) => boolean }[] = [
  { t: "Nhà bán", f: (x) => x.kind === "nha" && x.deal === "ban" },
  { t: "Đất nền bán", f: (x) => x.kind === "dat" && x.deal === "ban" },
  { t: "Căn hộ", f: (x) => x.kind === "can_ho" },
  { t: "Nhà cho thuê", f: (x) => x.kind === "nha" && x.deal === "cho_thue" },
  { t: "Mặt bằng & khác", f: (x) => x.kind === "mat_bang" || x.kind === "khac" },
];
const PROVINCES = ["Hà Nội", "Hồ Chí Minh", "Đà Nẵng"];
const PRICE_BUCKETS: [string, string][] = [
  ["", "Mức giá"], ["500000000", "Dưới 500 triệu"], ["1000000000", "Dưới 1 tỷ"],
  ["3000000000", "Dưới 3 tỷ"], ["5000000000", "Dưới 5 tỷ"], ["10000000000", "Dưới 10 tỷ"],
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { deal, kind, province, bedrooms, priceMax, q } = sp;
  const supabase = await createClient();

  let query = supabase.from("listings").select("*").eq("status", "published");
  if (deal === "ban" || deal === "cho_thue") query = query.eq("deal", deal);
  if (kind) query = query.eq("kind", kind);
  if (province) query = query.ilike("province", `%${province}%`);
  if (bedrooms) query = query.gte("bedrooms", Number(bedrooms));
  if (priceMax) query = query.lte("price_vnd", Number(priceMax));
  if (q) query = query.ilike("title", `%${q}%`);
  const { data } = await query.order("ai_score", { ascending: false, nullsFirst: false }).limit(150);
  const listings = (data ?? []) as Listing[];

  const { data: projData } = await supabase.from("projects").select("*").eq("status", "published").limit(6);
  const projects = (projData ?? []) as Project[];

  const hasFilter = Boolean(deal || kind || province || bedrooms || priceMax || q);
  const mapItems: MapItem[] = listings
    .filter((x) => x.lat != null && x.lng != null)
    .map((x) => ({ id: x.id, lat: x.lat!, lng: x.lng!, label: shortPrice(x.price_vnd), title: x.title }));

  const sel = "inp appearance-none pr-8 cursor-pointer";
  return (
    <div>
      <section className="pt-6 pb-2">
        <h1 className="prata text-3xl md:text-[2.6rem] leading-tight mb-2 text-balance">
          Tìm nhà đất bán &amp; cho thuê trên khắp Việt Nam
        </h1>
        <p className="text-[var(--ink-soft)] mb-5 max-w-2xl">
          Tổng hợp tin từ nhiều nguồn, AI chuẩn hoá &amp; chấm điểm độ tin cậy, tự phân loại chính chủ / môi giới
          và cảnh báo giá ảo.
        </p>

        {/* Bộ lọc nâng cao kiểu batdongsan */}
        <form action="/" className="card rounded-2xl p-3 shadow-sm">
          <div className="flex flex-wrap gap-2 items-center">
            <input
              name="q"
              defaultValue={q}
              placeholder="Từ khoá: quận, dự án, đường..."
              className="inp flex-1 min-w-[180px]"
            />
            <select name="deal" defaultValue={deal || ""} className={sel}>
              <option value="">Mua bán &amp; thuê</option>
              <option value="ban">Mua bán</option>
              <option value="cho_thue">Cho thuê</option>
            </select>
            <select name="kind" defaultValue={kind || ""} className={sel}>
              <option value="">Loại BĐS</option>
              {Object.entries(PROP).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
            <select name="province" defaultValue={province || ""} className={sel}>
              <option value="">Toàn quốc</option>
              {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select name="priceMax" defaultValue={priceMax || ""} className={sel}>
              {PRICE_BUCKETS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select name="bedrooms" defaultValue={bedrooms || ""} className={sel}>
              <option value="">Phòng ngủ</option>
              {[1, 2, 3, 4].map((b) => <option key={b} value={b}>{b}+ PN</option>)}
            </select>
            <button className="btn btn-primary px-6" type="submit">Tìm kiếm</button>
          </div>
        </form>
      </section>

      {hasFilter ? (
        <section className="mt-6">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="prata text-xl">{listings.length} kết quả{q ? ` cho “${q}”` : ""}</h2>
            <Link href="/" className="text-sm text-brand font-semibold">Xoá lọc</Link>
          </div>
          <div className="grid lg:grid-cols-[1fr_400px] gap-4 items-start">
            <div>
              <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
                {listings.map((x) => <ListingCard key={x.id} x={x} />)}
              </div>
              {!listings.length && (
                <p className="text-[var(--ink-soft)] py-10 text-center">Không có tin khớp bộ lọc.</p>
              )}
            </div>
            {mapItems.length > 0 && (
              <div className="hidden lg:block sticky top-20 h-[calc(100vh-7rem)]">
                <MapResults items={mapItems} />
              </div>
            )}
          </div>
        </section>
      ) : (
        <>
          {projects.length > 0 && (
            <section className="mt-9">
              <div className="flex items-baseline gap-3 mb-3">
                <h2 className="prata text-xl">Dự án nổi bật</h2>
                <Link href="/projects" className="text-sm text-brand font-semibold ml-auto">Xem tất cả →</Link>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {projects.slice(0, 3).map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}`}
                    className="card rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition group"
                  >
                    <div className="h-32 bg-gradient-to-br from-brand to-brand-2 grid place-items-center text-white text-3xl">
                      🏙️
                    </div>
                    <div className="p-4">
                      <div className="text-[0.65rem] font-bold uppercase tracking-wide text-brand mb-1">Dự án</div>
                      <h3 className="font-semibold leading-snug group-hover:text-brand transition">{p.name}</h3>
                      <div className="text-xs text-[var(--ink-soft)] mt-1">
                        {[p.district, p.province].filter(Boolean).join(", ")}
                      </div>
                      <div className="text-brand font-bold text-sm mt-2">
                        {fmtPrice(p.price_min, "ban")} - {fmtPrice(p.price_max, "ban")}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {CATS.map((c) => {
            const items = listings.filter(c.f).slice(0, 8);
            if (!items.length) return null;
            const catHref = c.f({ kind: "nha", deal: "ban" } as Listing)
              ? "/?kind=nha&deal=ban"
              : "/";
            return (
              <section key={c.t} className="mt-9">
                <div className="flex items-baseline gap-3 mb-3">
                  <h2 className="prata text-xl">{c.t}</h2>
                  <Link href={catHref} className="text-sm text-brand font-semibold ml-auto">Xem tất cả →</Link>
                </div>
                <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]">
                  {items.map((x) => <ListingCard key={x.id} x={x} />)}
                </div>
              </section>
            );
          })}
        </>
      )}

      {!listings.length && !hasFilter && (
        <p className="text-[var(--ink-soft)] py-10 text-center">
          Chưa có dữ liệu. Chạy <code>node supabase/seed.mjs</code> để nạp tin.
        </p>
      )}
    </div>
  );
}
