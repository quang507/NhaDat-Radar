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

const CATS: { t: string; f: (x: Listing) => boolean; href: string }[] = [
  { t: "Nhà bán", f: (x) => x.kind === "nha" && x.deal === "ban", href: "/?kind=nha&deal=ban" },
  { t: "Đất nền bán", f: (x) => x.kind === "dat" && x.deal === "ban", href: "/?kind=dat&deal=ban" },
  { t: "Căn hộ", f: (x) => x.kind === "can_ho", href: "/?kind=can_ho" },
  { t: "Nhà cho thuê", f: (x) => x.kind === "nha" && x.deal === "cho_thue", href: "/?kind=nha&deal=cho_thue" },
  { t: "Mặt bằng & khác", f: (x) => x.kind === "mat_bang" || x.kind === "khac", href: "/?kind=mat_bang" },
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
  if (bedrooms && !Number.isNaN(Number(bedrooms))) query = query.gte("bedrooms", Number(bedrooms));
  if (priceMax && !Number.isNaN(Number(priceMax))) query = query.lte("price_vnd", Number(priceMax));
  if (q) query = query.ilike("title", `%${q}%`);
  const { data } = await query.order("ai_score", { ascending: false, nullsFirst: false }).limit(150);
  const listings = (data ?? []) as Listing[];

  const { data: projData } = await supabase.from("projects").select("*").eq("status", "published").limit(6);
  const projects = (projData ?? []) as Project[];

  const withImg = listings.filter((x) => x.images && x.images.length > 0);
  const collage = withImg.slice(0, 3);
  const featured = withImg.slice(0, 8);
  const hasFilter = Boolean(deal || kind || province || bedrooms || priceMax || q);
  const mapItems: MapItem[] = listings
    .filter((x) => x.lat != null && x.lng != null)
    .map((x) => ({ id: x.id, lat: x.lat!, lng: x.lng!, label: shortPrice(x.price_vnd), title: x.title }));

  const sel = "inp appearance-none pr-8 cursor-pointer";
  return (
    <div>
      {/* ===== HERO (chia đôi: nội dung trái + ảnh thật phải) ===== */}
      <section className="grid lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-10 items-center pt-3 pb-6">
        <div className="hero-in">
          <h1 className="prata text-[2rem] md:text-[2.7rem] leading-[1.1] mb-3 text-balance">
            Tìm nhà đất bán &amp; cho thuê trên khắp Việt Nam
          </h1>
          <p className="text-[var(--ink-soft)] mb-5 max-w-xl">
            Tổng hợp tin từ nhiều nguồn, AI chuẩn hoá &amp; chấm điểm độ tin cậy, tự phân loại chính chủ / môi giới
            và cảnh báo giá ảo.
          </p>
          <form action="/" className="card rounded-2xl p-3 shadow-sm hero-in-2">
            <input name="q" defaultValue={q} placeholder="Từ khoá: quận, dự án, đường..." className="inp mb-2" />
            <div className="flex flex-wrap gap-2">
              <select name="deal" defaultValue={deal || ""} className={`${sel} flex-1 min-w-[120px]`}>
                <option value="">Mua bán &amp; thuê</option>
                <option value="ban">Mua bán</option>
                <option value="cho_thue">Cho thuê</option>
              </select>
              <select name="kind" defaultValue={kind || ""} className={`${sel} flex-1 min-w-[110px]`}>
                <option value="">Loại BĐS</option>
                {Object.entries(PROP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select name="province" defaultValue={province || ""} className={`${sel} flex-1 min-w-[110px]`}>
                <option value="">Toàn quốc</option>
                {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <select name="priceMax" defaultValue={priceMax || ""} className={`${sel} flex-1 min-w-[110px]`}>
                {PRICE_BUCKETS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <select name="bedrooms" defaultValue={bedrooms || ""} className={`${sel} w-[92px]`}>
                <option value="">PN</option>
                {[1, 2, 3, 4].map((b) => <option key={b} value={b}>{b}+</option>)}
              </select>
              <button className="btn btn-primary px-6" type="submit">Tìm kiếm</button>
            </div>
          </form>
        </div>

        {collage.length >= 3 && (
          <div className="hero-art hidden lg:grid grid-cols-2 grid-rows-2 gap-3 h-[380px]">
            {collage.map((x, i) => (
              <Link
                key={x.id}
                href={`/listings/${x.id}`}
                className={`relative rounded-2xl overflow-hidden shadow-md ${i === 0 ? "row-span-2" : ""}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={x.images[0]} alt={x.title} className="w-full h-full object-cover" />
                <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent" />
                <span className="absolute bottom-2 left-2 text-white text-sm font-bold drop-shadow">
                  {shortPrice(x.price_vnd)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {hasFilter ? (
        <section className="mt-2">
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
            <Section title="Dự án nổi bật" href="/projects">
              <div className="grid gap-4 md:grid-cols-3">
                {projects.slice(0, 3).map((p) => (
                  <Link key={p.id} href={`/projects/${p.id}`} className="card rounded-2xl overflow-hidden shadow-sm hover:shadow-lg transition group">
                    <div className="h-32 bg-gradient-to-br from-brand to-brand-2 grid place-items-center text-white text-3xl">🏙️</div>
                    <div className="p-4">
                      <div className="text-[0.65rem] font-bold uppercase tracking-wide text-brand mb-1">Dự án</div>
                      <h3 className="font-semibold leading-snug group-hover:text-brand transition">{p.name}</h3>
                      <div className="text-xs text-[var(--ink-soft)] mt-1">{[p.district, p.province].filter(Boolean).join(", ")}</div>
                      <div className="text-brand font-bold text-sm mt-2">{fmtPrice(p.price_min, "ban")} - {fmtPrice(p.price_max, "ban")}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {featured.length > 0 && (
            <Section title="Bất động sản nổi bật" href="/?deal=ban">
              <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]">
                {featured.map((x) => <ListingCard key={x.id} x={x} />)}
              </div>
            </Section>
          )}

          {CATS.map((c) => {
            const items = listings.filter(c.f).slice(0, 8);
            if (!items.length) return null;
            return (
              <Section key={c.t} title={c.t} href={c.href}>
                <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]">
                  {items.map((x) => <ListingCard key={x.id} x={x} />)}
                </div>
              </Section>
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

function Section({ title, href, children }: { title: string; href: string; children: React.ReactNode }) {
  return (
    <section className="mt-9">
      <div className="flex items-baseline gap-3 mb-3">
        <h2 className="prata text-xl">{title}</h2>
        <Link href={href} className="text-sm text-brand font-semibold ml-auto">Xem tất cả →</Link>
      </div>
      {children}
    </section>
  );
}
