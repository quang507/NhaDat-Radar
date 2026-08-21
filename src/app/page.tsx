export const dynamic = "force-dynamic";

import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LISTING_COLS, LISTING_CARD_COLS } from "@/lib/cols";
import ListingCard from "@/components/ListingCard";
import MapResults, { type MapItem } from "@/components/MapResults";
import { fmtPrice, PROP, shortPrice } from "@/lib/format";
import { getAreas } from "@/lib/geo";
import type { Listing, Project } from "@/lib/types";

// Ảnh hero thương hiệu: đặt file tại public/hero.jpg (hoặc .png/.webp) là tự dùng.
// Tính 1 lần lúc module load (audit 16/8: bản cũ existsSync 3 lần mỗi request).
const HERO: string | null = (() => {
  for (const f of ["hero.jpg", "hero.png", "hero.webp"]) {
    if (fs.existsSync(path.join(process.cwd(), "public", f))) return "/" + f;
  }
  return null;
})();

const CATS: { t: string; f: (x: Listing) => boolean; href: string }[] = [
  { t: "Nhà bán", f: (x) => x.kind === "nha" && x.deal === "ban", href: "/?kind=nha&deal=ban" },
  { t: "Đất nền bán", f: (x) => x.kind === "dat" && x.deal === "ban", href: "/?kind=dat&deal=ban" },
  { t: "Căn hộ", f: (x) => x.kind === "can_ho", href: "/?kind=can_ho" },
  { t: "Nhà cho thuê", f: (x) => x.kind === "nha" && x.deal === "cho_thue", href: "/?kind=nha&deal=cho_thue" },
  // khối và link phải cùng bộ lọc - bản cũ khối gồm cả "khac" nhưng link chỉ mat_bang,
  // bấm "Xem tất cả" là tin đang hiện biến mất
  { t: "Mặt bằng kinh doanh", f: (x) => x.kind === "mat_bang", href: "/?kind=mat_bang" },
];
const PROVINCES = ["Hà Nội", "Hồ Chí Minh", "Đà Nẵng"];
const PRICE_BUCKETS: [string, string][] = [
  ["500000000", "Dưới 500 triệu"], ["1000000000", "Dưới 1 tỷ"],
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

  let query = supabase.from("listings").select(LISTING_CARD_COLS).eq("status", "published");
  if (deal === "ban" || deal === "cho_thue") query = query.eq("deal", deal);
  if (kind) query = query.eq("kind", kind);
  if (province) query = query.ilike("province", `%${province}%`);
  if (bedrooms && !Number.isNaN(Number(bedrooms))) query = query.gte("bedrooms", Number(bedrooms));
  if (priceMax && !Number.isNaN(Number(priceMax))) query = query.lte("price_vnd", Number(priceMax));
  if (q) query = query.ilike("title", `%${q}%`);
  const { data } = await query.order("first_seen_at", { ascending: false, nullsFirst: false }).limit(150);
  const listings = (data ?? []) as Listing[];

  // count exact: bộ đếm "dự án" phải là tổng toàn DB, không phải độ dài danh sách limit(6) (bug 17/8: hero hiện "6 dự án" trong khi DB có 30)
  const { data: projData, count: projectCount } = await supabase
    .from("projects").select("*", { count: "exact" }).eq("status", "published")
    .order("priority", { ascending: false }).order("name").limit(6);
  const projects = (projData ?? []) as Project[];

  // Số liệu "tin đang rao / quận / nguồn" phải THẬT trên toàn DB (UX audit 16/8: trước đây đếm trên 150 tin
  // đầu danh sách -> hiện "150+ tin · 1 nguồn" trong khi DB có 1.800 tin / 6 nguồn).
  // Dùng cây khu vực cache 10' (lib/geo) thay vì select 5.000 dòng mỗi lần vào trang chủ.
  const areas = await getAreas();
  const totalPublished = areas.total, districtCount = areas.districtCount, sourceCount = areas.sources;

  // Ưu tiên hiển thị BĐS miền Nam (giữ thứ tự mới-nhất trong từng nhóm)
  const SOUTH = /hồ chí minh|bình dương|đồng nai|cần thơ|vũng tàu|bà rịa|long an|tây ninh|tiền giang|an giang|kiên giang|cà mau|bến tre|vĩnh long|sóc trăng|đồng tháp|hậu giang|bạc liêu|trà vinh/i;
  const isSouth = (x: Listing) => SOUTH.test(x.province || "");
  listings.sort((a, b) => Number(isSouth(b)) - Number(isSouth(a)));

  const withImg = listings.filter((x) => x.images && x.images.length > 0);
  // Cụm ảnh hero: 3 tin điểm chất lượng cao nhất có ảnh (không lấy tùy tiện)
  const collage = [...withImg].sort((a, b) => (b.ai_score ?? 0) - (a.ai_score ?? 0)).slice(0, 3);
  const featured = withImg.slice(0, 8);
  const hasFilter = Boolean(deal || kind || province || bedrooms || priceMax || q);
  const mapItems: MapItem[] = listings
    .filter((x) => x.lat != null && x.lng != null)
    .map((x) => ({ id: x.id, lat: x.lat!, lng: x.lng!, label: shortPrice(x.price_vnd), title: x.title }));

  const sel = "inp appearance-none pr-8 cursor-pointer";
  const hero = HERO;
  return (
    <div>
      {/* ===== BANNER QUẢNG CÁO ĐỐI TÁC (public/hero.jpg) - full width, KHÔNG đè chữ của Radar lên
          (UX audit 16/8: H1 "Tìm nhà đất…" từng nằm đè lên "VILLA NY'AH" -> hai thông điệp chồng nhau).
          Gắn nhãn "Quảng cáo" (minh bạch), bấm được nếu có NEXT_PUBLIC_HERO_LINK. Mobile cắt vừa 200px. ===== */}
      {!hasFilter && hero && (
        <section className="hero-art relative overflow-hidden rounded-xl shadow-sm mb-6">
          {(() => {
            // banner Villa Ny'ah -> trang Nhã Đạt (anh Quang chốt 16/8); env ghi đè được khi đổi đối tác
            const link = process.env.NEXT_PUBLIC_HERO_LINK || "https://nhadat.company/";
            /* eslint-disable-next-line @next/next/no-img-element */
            const img = <img src={hero} alt={process.env.NEXT_PUBLIC_HERO_ALT || "Quảng cáo đối tác"} className="w-full h-auto" />;
            return link ? <a href={link} target="_blank" rel="noopener sponsored" aria-label="Xem quảng cáo đối tác">{img}</a> : img;
          })()}
          <span className="absolute top-2 right-3 text-[0.65rem] font-semibold px-1.5 py-0.5 rounded bg-black/45 text-white/90 tracking-wide">Quảng cáo</span>
        </section>
      )}

      {/* ===== HERO Radar: H1 + ô tìm kiếm luôn ở đây (không phụ thuộc banner) ===== */}
      <section className="grid lg:grid-cols-[1.05fr_0.95fr] gap-8 lg:gap-10 items-center pt-3 pb-6">
        <div className="hero-in">
          <h1 className={`prata leading-[1.1] mb-3 text-balance ${hero ? "text-[1.6rem] md:text-[2.1rem]" : "text-[2rem] md:text-[2.7rem]"}`}>
            Tìm nhà đất bán &amp; cho thuê trên khắp Việt Nam
          </h1>
          <p className="text-[var(--ink-soft)] mb-5 max-w-xl">
            Tổng hợp tin từ nhiều nguồn, ghi rõ nguồn &amp; thời điểm Radar thấy tin, so giá với mặt bằng khu vực,
            nêu dấu hiệu chính chủ / môi giới từ dữ liệu.
          </p>
          <form action="/search" className="card rounded-lg p-3 shadow-sm hero-in-2">
            <input name="q" defaultValue={q} placeholder="Từ khoá: quận, dự án, đường..." className="inp mb-2" />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <select name="deal" defaultValue={deal || ""} className={sel}>
                <option value="">Mua bán &amp; thuê</option>
                <option value="ban">Mua bán</option>
                <option value="cho_thue">Cho thuê</option>
              </select>
              <select name="kind" defaultValue={kind || ""} className={sel}>
                <option value="">Loại BĐS</option>
                {Object.entries(PROP).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select name="province" defaultValue={province || ""} className={sel}>
                <option value="">Toàn quốc</option>
                {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <select name="priceMax" defaultValue={priceMax || ""} className={sel}>
                <option value="">Mức giá</option>
                {PRICE_BUCKETS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <select name="bedrooms" defaultValue={bedrooms || ""} className={sel}>
                <option value="">Số phòng ngủ</option>
                {[1, 2, 3, 4].map((b) => <option key={b} value={b}>{b}+ phòng ngủ</option>)}
              </select>
              <button className="btn btn-primary" type="submit">Tìm kiếm</button>
            </div>
          </form>
          <div className="flex gap-6 mt-5 hero-in-2">
            <Stat n={totalPublished ?? listings.length} label="tin đang rao" />
            <Stat n={projectCount ?? projects.length} label="dự án" />
            <Stat n={districtCount} label="quận/huyện" />
            <Stat n={sourceCount} label="nguồn dữ liệu" />
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
                <span className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/75 to-transparent" />
                {i === 0 && (
                  <span className="absolute top-2 left-2 text-[0.65rem] font-bold px-2 py-0.5 rounded bg-brand text-white">Tin nổi bật</span>
                )}
                <span className="absolute inset-x-0 bottom-0 p-2.5 text-white drop-shadow">
                  <span className="block text-sm font-bold">{shortPrice(x.price_vnd)}{x.area_m2 ? ` · ${x.area_m2} m²` : ""}</span>
                  <span className="block text-[0.7rem] leading-snug line-clamp-1 opacity-95">{x.title}</span>
                  <span className="block text-[0.65rem] opacity-75">{[x.district, x.province].filter(Boolean).join(", ")}</span>
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
                    {/* Ảnh chiếm ~2/3 card (16:10), mô tả gọn 1 khối - ảnh là thứ bán dự án */}
                    <div className="aspect-[16/10] bg-[#16233a] grid place-items-center overflow-hidden">
                      {p.images?.[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300" />
                      ) : (
                        <span className="prata text-white/40 text-lg px-4 text-center leading-snug">{p.name}</span>
                      )}
                    </div>
                    <div className="p-3.5">
                      <h3 className="font-semibold leading-snug group-hover:text-brand transition line-clamp-1">{p.name}</h3>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-brand font-bold text-sm whitespace-nowrap">{fmtPrice(p.price_min, "ban")} - {fmtPrice(p.price_max, "ban")}</span>
                        <span className="text-xs text-[var(--ink-soft)] truncate ml-auto">{[p.district, p.province].filter(Boolean).join(", ")}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </Section>
          )}

          {/* khối "nổi bật" trộn cả bán + thuê (ưu tiên có ảnh) -> link sang search sort điểm,
              không phải /?deal=ban (tin thuê đang hiện sẽ biến mất sau khi bấm) */}
          {featured.length > 0 && (
            <Section title="Bất động sản nổi bật" href="/search?sort=score">
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
                <span className="block font-bold text-sm group-hover/t:text-brand transition-colors">{t} ›</span>
                <span className="block text-xs text-[var(--ink-soft)] mt-0.5">{d}</span>
              </Link>
            ))}
          </section>

          {/* ===== Micro: nhận email tin mới ===== */}
          <section className="mt-10 card rounded-xl p-8 flex flex-col sm:flex-row items-center gap-5 border-l-2 !border-l-brand/60">
            <div className="flex-1 text-center sm:text-left">
              <h2 className="font-bold text-lg">Đừng bỏ lỡ căn nhà ưng ý</h2>
              <p className="text-sm text-[var(--ink-soft)]">
                Lưu bộ lọc tìm kiếm của bạn - mỗi sáng có tin mới khớp, chúng tôi gửi thẳng vào email.
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
                  <span className="inline-block mt-4 text-xs font-semibold text-white/70 group-hover/c:text-white transition">Xem tin ›</span>
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
        <Link href={href} className="text-sm text-brand font-semibold ml-auto whitespace-nowrap">Xem tất cả ›</Link>
      </div>
      {children}
    </section>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  // "+" chỉ hợp lý với số lớn xấp xỉ; số nhỏ/đếm chính xác hiện đúng giá trị.
  return (
    <div>
      <div className="text-xl font-extrabold text-brand">{n.toLocaleString("vi-VN")}</div>
      <div className="text-xs text-[var(--ink-soft)]">{label}</div>
    </div>
  );
}
