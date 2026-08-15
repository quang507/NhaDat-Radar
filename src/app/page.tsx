export const dynamic = "force-dynamic";

import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import ListingCard from "@/components/ListingCard";
import MapResults, { type MapItem } from "@/components/MapResults";
import { fmtPrice, PROP } from "@/lib/format";
import type { Listing, Project } from "@/lib/types";

// Ảnh hero thương hiệu: đặt file tại public/hero.jpg (hoặc .png/.webp) là tự dùng.
function heroImage(): string | null {
  for (const f of ["hero.jpg", "hero.png", "hero.webp"]) {
    if (fs.existsSync(path.join(process.cwd(), "public", f))) return "/" + f;
  }
  return null;
}

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
  const { data } = await query.order("first_seen_at", { ascending: false, nullsFirst: false }).limit(150);
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
  const hero = heroImage();
  return (
    <div>
      {/* ===== HERO banner thương hiệu — full width, không bo góc ===== */}
      {!hasFilter && hero && (
        <section className="hero-art relative w-screen left-1/2 -translate-x-1/2 overflow-hidden mb-6 -mt-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {/* md+: h-auto = hiện TRỌN ảnh theo tỷ lệ gốc, không cắt; mobile giữ khung 260px cho chữ dễ đọc */}
          <img src={hero} alt="NhaDat Radar" className="w-full h-[260px] object-cover md:h-auto md:object-contain" />
          {/* lớp phủ nhẹ, chỉ đậm ở mép trái để chữ dễ đọc */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/45 via-black/10 to-transparent" />
          <div className="absolute inset-0">
            <div className="max-w-6xl mx-auto px-5 h-full flex flex-col justify-center pt-6 md:pt-16">
              <div className="max-w-2xl">
                <h1 className="prata text-white text-[1.6rem] md:text-[2.6rem] leading-[1.12] mb-2.5 drop-shadow-lg hero-in">
                  Tìm nhà đất bán &amp; cho thuê<br />trên khắp Việt Nam
                </h1>
                <p className="text-white/90 text-sm md:text-base mb-4 max-w-lg drop-shadow hero-in-2 hidden sm:block">
                  Tổng hợp tin đa nguồn, AI chuẩn hoá &amp; cảnh báo giá ảo.
                </p>
                <div className="flex gap-2.5 hero-in-2">
                  <Link href="/search" className="btn !py-2 !rounded-none !bg-white !text-brand !border-white font-bold">Tìm kiếm ngay</Link>
                  <Link href="/dinh-gia" className="btn !py-2 !rounded-none !bg-transparent !text-white !border-white/70 hover:!bg-white/10">Định giá AI</Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ===== HERO (chia đôi: nội dung trái + ảnh thật phải) — ẩn phần headline nếu đã có banner ===== */}
      <section className="grid lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-10 items-center pt-3 pb-6">
        <div className="hero-in">
          {!hero && (
            <>
              <h1 className="prata text-[2rem] md:text-[2.7rem] leading-[1.1] mb-3 text-balance">
                Tìm nhà đất bán &amp; cho thuê trên khắp Việt Nam
              </h1>
              <p className="text-[var(--ink-soft)] mb-5 max-w-xl">
                Tổng hợp tin từ nhiều nguồn, AI chuẩn hoá &amp; chấm điểm độ tin cậy, tự phân loại chính chủ / môi giới
                và cảnh báo giá ảo.
              </p>
            </>
          )}
          {hero && <h2 className="prata text-xl md:text-2xl mb-3">Bắt đầu tìm kiếm</h2>}
          <form action="/search" className="card rounded-lg p-3 shadow-sm hero-in-2">
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
          <div className="flex gap-6 mt-5 hero-in-2">
            <Stat n={listings.length} label="tin đang rao" />
            <Stat n={projects.length} label="dự án" />
            <Stat n={new Set(listings.map((x) => x.district).filter(Boolean)).size} label="quận/huyện" />
            <Stat n={new Set(listings.map((x) => x.source_site).filter(Boolean)).size} label="nguồn dữ liệu" />
          </div>
        </div>

        {collage.length >= 3 && (
          <div className="hero-art hidden lg:grid grid-cols-2 grid-rows-2 gap-3 h-[380px]">
            {collage.map((x, i) => (
              <Link
                key={x.id}
                href={`/listings/${x.id}`}
                className={`relative rounded-lg overflow-hidden shadow-md ${i === 0 ? "row-span-2" : ""}`}
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
                  <Link key={p.id} href={`/projects/${p.id}`} className="card rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition group">
                    <div className="h-32 bg-[#16233a] grid place-items-center overflow-hidden">
                      {p.images?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="prata text-white/40 text-lg px-4 text-center leading-snug">{p.name}</span>
                      )}
                    </div>
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
            const items = listings.filter(c.f).filter((x) => x.images && x.images.length > 0).slice(0, 8);
            if (!items.length) return null;
            return (
              <Section key={c.t} title={c.t} href={c.href}>
                <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]">
                  {items.map((x) => <ListingCard key={x.id} x={x} />)}
                </div>
              </Section>
            );
          })}

          {/* ===== Micro: bộ công cụ ===== */}
          <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {([
              ["/dinh-gia", "🏷️", "AI Định Giá", "Biết giá trị nhà trong 10 giây"],
              ["/tinh-lai-vay", "🧮", "Tính Lãi Vay", "Ước tính khoản góp hàng tháng"],
              ["/thue-hay-mua", "⚖️", "Thuê hay Mua?", "So sánh + yield từng quận"],
              ["/thong-ke", "📊", "Bản Đồ Giá", "Giá trung vị theo khu vực"],
            ] as const).map(([href, , t, d]) => (
              <Link key={href} href={href} className="card rounded-xl p-4 hover:border-[var(--line-strong)] hover:shadow-md transition-all group/t">
                <span className="block font-bold text-sm group-hover/t:text-brand transition-colors">{t} →</span>
                <span className="block text-xs text-[var(--ink-soft)] mt-0.5">{d}</span>
              </Link>
            ))}
          </section>

          {/* ===== Micro: nhận email tin mới ===== */}
          <section className="mt-10 card rounded-xl p-8 flex flex-col sm:flex-row items-center gap-5 border-l-2 !border-l-brand/60">
            <div className="flex-1 text-center sm:text-left">
              <h2 className="font-bold text-lg">Đừng bỏ lỡ căn nhà ưng ý</h2>
              <p className="text-sm text-[var(--ink-soft)]">
                Lưu bộ lọc tìm kiếm của bạn — mỗi sáng có tin mới khớp, chúng tôi gửi thẳng vào email.
              </p>
            </div>
            <Link href="/search" className="btn btn-primary whitespace-nowrap">Tạo thông báo ngay</Link>
          </section>

          {/* ===== Duyệt theo danh mục ===== */}
          <section className="mt-16">
            <h2 className="prata text-xl mb-4 border-l-[3px] border-brand pl-3">Duyệt theo danh mục</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {([
                ["nha", "Nhà Riêng", "Tìm ngôi nhà hoàn hảo cho gia đình"],
                ["can_ho", "Căn Hộ", "Cuộc sống đô thị tiện nghi"],
                ["dat", "Đất Nền", "Đầu tư cho tương lai vững chắc"],
                ["mat_bang", "Mặt Bằng", "Không gian kinh doanh chuyên nghiệp"],
              ] as const).map(([kind, t, d]) => (
                <Link
                  key={kind}
                  href={`/search?kind=${kind}`}
                  className="rounded-xl p-6 bg-[#16233a] text-white hover:bg-[#1c2c48] transition group/c"
                >
                  <h3 className="prata text-xl mb-1 group-hover/c:text-white/90">{t}</h3>
                  <p className="text-sm text-white/60">{d}</p>
                  <span className="inline-block mt-4 text-xs font-semibold text-white/70 group-hover/c:text-white transition">Xem tin →</span>
                </Link>
              ))}
            </div>
          </section>
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
    <section className="mt-10">
      <div className="flex items-baseline gap-3 mb-4">
        <h2 className="prata text-xl md:text-2xl border-l-[3px] border-brand pl-3">{title}</h2>
        <Link href={href} className="text-sm text-brand font-semibold ml-auto whitespace-nowrap">Xem tất cả →</Link>
      </div>
      {children}
    </section>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  // "+" chỉ hợp lý với số lớn xấp xỉ; số nhỏ/đếm chính xác hiện đúng giá trị.
  return (
    <div>
      <div className="text-xl font-extrabold text-brand">{n.toLocaleString("vi-VN")}{n >= 100 ? "+" : ""}</div>
      <div className="text-xs text-[var(--ink-soft)]">{label}</div>
    </div>
  );
}
