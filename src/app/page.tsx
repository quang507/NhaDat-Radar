export const revalidate = 1800;   // 23/9: trang chủ cache 5 phút (dữ liệu chỉ đổi mỗi lượt crawl)

import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { createAnonClient } from "@/lib/supabase/anon";   // KHÔNG cookie -> trang cache được (23/9)
import { LISTING_COLS, LISTING_THE_COLS } from "@/lib/cols";
import ListingCard from "@/components/ListingCard";
import DaiDocQuyen from "@/components/DaiDocQuyen";
import HangVuot from "@/components/HangVuot";
import HeroTimKiem, { type ChipKhuVuc } from "@/components/HeroTimKiem";
import { laTinDocQuyen } from "@/lib/doc-quyen";
import { tronRoHang, laRoHang } from "@/lib/ro-hang";
import { Sparkles, Calculator, Scale, BarChart3, BellRing, Home as HomeIcon, Building2, LandPlot, Store, ArrowRight } from "lucide-react";

// thứ hạng ưu tiên trong lưới kết quả: tin Zalo (0) -> rổ hàng Radar (1) -> tin FB (2) -> nguồn web (3)
const uuTienDocQuyen = (x: Listing) =>
  !laTinDocQuyen(x) ? 3 : (x.source_site || "").startsWith("zalo") || x.source === "zalo_oa" || x.source === "zalo_miniapp" ? 0 : laRoHang(x) ? 1 : 2;
import MapResults, { type MapItem } from "@/components/MapResults";
import { fmtPrice, PROP, shortPrice } from "@/lib/format";
import { getAreas } from "@/lib/geo";
import type { Listing, Project } from "@/lib/types";
import { cheTinDocQuyen } from "@/lib/doc-quyen";
import { unstable_cache } from "next/cache";

// Trang chủ là trang bị bot gọi nhiều nhất. Next 15 không cache fetch mặc định -> mỗi lượt là 2 truy
// vấn Supabase. Cache 5 phút theo BỘ LỌC trên URL (dữ liệu chỉ đổi mỗi lượt crawl 4 tiếng) - 23/9.
const layTinTrangChu = unstable_cache(
  async (deal?: string, kind?: string, province?: string, bedrooms?: string, priceMax?: string, q?: string) => {
    const supabase = createAnonClient();
    // builder của supabase-js bị MUTATE khi gọi filter -> mỗi truy vấn phải dựng mới từ hàm này
    const taoQuery = () => {
      let query = supabase.from("listings").select(LISTING_THE_COLS).eq("status", "published");
      if (deal === "ban" || deal === "cho_thue") query = query.eq("deal", deal);
      if (kind) query = query.eq("kind", kind);
      if (province) query = query.ilike("province", `%${province}%`);
      if (bedrooms && !Number.isNaN(Number(bedrooms))) query = query.gte("bedrooms", Number(bedrooms));
      if (priceMax && !Number.isNaN(Number(priceMax))) query = query.lte("price_vnd", Number(priceMax));
      if (q) query = query.ilike("title", `%${q}%`);
      return query;
    };
    // 28/9: rổ hàng Radar truy vấn riêng rồi trộn 2:1 với tin còn lại (lib/ro-hang) - không thì
    // 1.400 phòng EvoHome nhập cùng lúc chiếm trọn 150 chỗ "mới nhất", hoặc ngược lại bị crawl đè.
    const [{ data: rhData }, { data }, { data: projData, count: projectCount }] = await Promise.all([
      taoQuery().eq("source", "ro_hang").order("first_seen_at", { ascending: false, nullsFirst: false }).limit(100),
      taoQuery().neq("source", "ro_hang").order("first_seen_at", { ascending: false, nullsFirst: false }).limit(150),
      supabase.from("projects").select("*", { count: "exact" }).eq("status", "published")
        .order("priority", { ascending: false }).order("name").limit(6),
    ]);
    return { data: tronRoHang((rhData ?? []) as { id: string }[], (data ?? []) as { id: string }[]), projData: projData ?? [], projectCount: projectCount ?? 0 };
  },
  ["home-listings-v6"],
  { revalidate: 1800, tags: ["listings"] },   // 30 phút (2/10, egress): mỗi lần làm mới kéo 250 tin
);

// Title/description có SỐ THẬT (số tin, số tỉnh) thay vì câu quảng cáo chung chung - dữ liệu lấy từ
// cây khu vực đã cache 10 phút nên không thêm truy vấn (23/9).
export async function generateMetadata() {
  try {
    const { total, districtCount, sources } = await getAreas();
    return {
      title: `NhaDat Radar - ${total.toLocaleString("vi-VN")} tin nhà đất bán & cho thuê, giá thật theo khu vực`,
      description: `${total.toLocaleString("vi-VN")} tin nhà đất từ ${sources} nguồn, phủ ${districtCount} quận/huyện: giá trung vị theo m², xu hướng giá, cảnh báo giá lệch và dấu hiệu môi giới/chính chủ. Cập nhật hằng ngày.`,
      alternates: { canonical: "/" },
    };
  } catch {
    return { alternates: { canonical: "/" } };
  }
}

// Ảnh hero thương hiệu: đặt file tại public/hero.jpg (hoặc .png/.webp) là tự dùng.
// Tính 1 lần lúc module load (audit 16/8: bản cũ existsSync 3 lần mỗi request).
const HERO: string | null = (() => {
  for (const f of ["hero.jpg", "hero.png", "hero.webp"]) {
    if (fs.existsSync(path.join(process.cwd(), "public", f))) return "/" + f;
  }
  return null;
})();

const CATS: { t: string; f: (x: Listing) => boolean; href: string }[] = [
  { t: "Nhà bán", f: (x) => x.kind === "nha" && x.deal === "ban", href: "/search?kind=nha&deal=ban" },
  { t: "Đất nền bán", f: (x) => x.kind === "dat" && x.deal === "ban", href: "/search?kind=dat&deal=ban" },
  { t: "Căn hộ", f: (x) => x.kind === "can_ho", href: "/search?kind=can_ho" },
  { t: "Nhà cho thuê", f: (x) => x.kind === "nha" && x.deal === "cho_thue", href: "/search?kind=nha&deal=cho_thue" },
  // khối và link phải cùng bộ lọc - bản cũ khối gồm cả "khac" nhưng link chỉ mat_bang,
  // bấm "Xem tất cả" là tin đang hiện biến mất
  { t: "Mặt bằng kinh doanh", f: (x) => x.kind === "mat_bang", href: "/search?kind=mat_bang" },
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { deal, kind, province, bedrooms, priceMax, q } = sp;
  const { data, projData, projectCount } = await layTinTrangChu(deal, kind, province, bedrooms, priceMax, q);
  const listings = ((data ?? []) as Listing[]).map(cheTinDocQuyen);

  // count exact: bộ đếm "dự án" phải là tổng toàn DB, không phải độ dài danh sách limit(6) (bug 17/8: hero hiện "6 dự án" trong khi DB có 30)
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

  // Chip khu vực dưới ô tìm kiếm: quận TP.HCM nhiều tin nhất theo thuê/bán (bảng đếm cache, không thêm truy vấn)
  const hcm = areas.counts["Hồ Chí Minh"];
  const chipQuan = (d: "ban" | "cho_thue"): ChipKhuVuc[] => Object.entries(hcm?.districts || {})
    .map(([district, c]) => ({ province: "Hồ Chí Minh", district, n: c[d] }))
    .filter((c) => c.n > 0).sort((a, b) => b.n - a.n).slice(0, 10);
  const chip = { cho_thue: chipQuan("cho_thue"), ban: chipQuan("ban") };
  const hasFilter = Boolean(deal || kind || province || bedrooms || priceMax || q);
  const mapItems: MapItem[] = listings
    .filter((x) => x.lat != null && x.lng != null)
    .map((x) => ({ id: x.id, lat: x.lat!, lng: x.lng!, label: shortPrice(x.price_vnd), title: x.title }));

  const hero = HERO;
  return (
    <div>
      {/* ===== HERO kiểu Mogi (30/9): màn đầu là Ô TÌM KIẾM (tab Thuê | Mua | Định giá + chip khu vực/giá).
          Trước đây banner quảng cáo chiếm gần hết màn đầu, ô tìm nửa bề ngang nằm dưới. ===== */}
      <section className="pt-1 pb-5">
        <h1 className={`prata leading-[1.15] mb-2 text-balance ${hasFilter ? "text-[1.4rem] md:text-[1.8rem]" : "text-[1.6rem] md:text-[2.3rem]"}`}>
          Tìm nhà đất bán &amp; cho thuê trên khắp Việt Nam
        </h1>
        <p className="text-sm text-[var(--ink-soft)] mb-4 max-w-2xl">
          Tổng hợp tin tức mua bán cho thuê bất động sản được làm mới mỗi ngày.
        </p>
        <HeroTimKiem chip={chip} />
        <div className="flex gap-6 mt-4 overflow-x-auto [scrollbar-width:none]">
          <Stat n={totalPublished ?? listings.length} label="tin đang rao" />
          <Stat n={projectCount ?? projects.length} label="dự án" />
          <Stat n={districtCount} label="quận/huyện" />
          <Stat n={sourceCount} label="nguồn dữ liệu" />
        </div>
      </section>

      {/* ===== BANNER QUẢNG CÁO ĐỐI TÁC (public/hero.jpg) - dời xuống DƯỚI ô tìm kiếm (30/9), giữ nguyên
          tỉ lệ (cắt thấp thì mất chữ quảng cáo "40 phút từ Sài Gòn"). Gắn nhãn "Quảng cáo" (minh bạch), link NEXT_PUBLIC_HERO_LINK. ===== */}
      {!hasFilter && hero && (
        <section className="hero-art relative overflow-hidden rounded-xl shadow-sm mb-2">
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

      {hasFilter ? (
        <section className="mt-2">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="prata text-xl">{listings.length} kết quả{q ? ` cho “${q}”` : ""}</h2>
            <Link href="/" className="text-sm text-brand font-semibold">Xoá lọc</Link>
          </div>
          <div className="grid lg:grid-cols-[1fr_400px] gap-4 items-start">
            <div>
              <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
                {/* độc quyền luôn trên cùng: Zalo -> FB -> còn lại (trong nhóm giữ thứ tự mới nhất) */}
                {[...listings]
                  .sort((a, b) => uuTienDocQuyen(a) - uuTienDocQuyen(b))
                  .map((x) => <ListingCard key={x.id} x={x} />)}
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
          {/* dải độc quyền (FB + Zalo, tin Zalo trước) đứng đầu trang chủ - vị trí đẹp nhất cho hàng bán được */}
          <DaiDocQuyen listings={listings} />
          {projects.length > 0 && (
            <Section title="Dự án nổi bật" href="/projects">
              <HangVuot items={projects.slice(0, 3).map((p) => ({ key: p.id, node: (
                  <Link href={`/projects/${p.id}`} className="card rounded-lg overflow-hidden shadow-sm hover:shadow-lg transition group w-full">
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
              ) }))} />
            </Section>
          )}

          {/* 30/9: bỏ khối "Bất động sản nổi bật" - trùng dải độc quyền phía trên (cùng các phòng rổ hàng) */}
          {CATS.map((c) => {
            const items = listings.filter(c.f).filter((x) => x.images && x.images.length > 0).slice(0, 8);
            if (!items.length) return null;
            return (
              <Section key={c.t} title={c.t} href={c.href}>
                <HangVuot cot={230} toiDaSm={4} items={items.map((x) => ({ key: x.id, node: <ListingCard x={x} /> }))} />
              </Section>
            );
          })}

          {/* ===== Micro: bộ công cụ ===== */}
          <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { href: "/dinh-gia", icon: Sparkles, t: "AI Định Giá", d: "Biết giá trị nhà trong 10 giây", tag: "AI Realtime" },
              { href: "/tinh-lai-vay", icon: Calculator, t: "Tính Lãi Vay", d: "Ước tính khoản góp hàng tháng", tag: "Tài chính" },
              { href: "/thue-hay-mua", icon: Scale, t: "Thuê hay Mua?", d: "So sánh + tỷ suất sinh lời từng quận", tag: "Phân tích" },
              { href: "/thong-ke", icon: BarChart3, t: "Bản Đồ Giá", d: "Giá trung vị theo khu vực", tag: "Dữ liệu thật" },
            ].map(({ href, icon: Icon, t, d, tag }) => (
              <Link
                key={href}
                href={href}
                className="card rounded-2xl p-5 hover:border-brand/60 hover:shadow-lg transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center group-hover:bg-brand group-hover:text-white transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[0.68rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--surface-2)] text-[var(--ink-faint)]">
                      {tag}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-[var(--ink)] group-hover:text-brand transition-colors">
                    {t}
                  </h3>
                  <p className="text-xs text-[var(--ink-soft)] mt-1 leading-relaxed">
                    {d}
                  </p>
                </div>
                <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-brand">
                  <span>Trải nghiệm ngay</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ))}
          </section>

          {/* ===== Micro: nhận email tin mới ===== */}
          <section className="mt-10 card rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-5 border border-[var(--line)] bg-gradient-to-r from-brand/5 via-transparent to-transparent">
            <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
              <BellRing className="w-6 h-6" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="font-bold text-lg">Đừng bỏ lỡ căn nhà ưng ý</h2>
              <p className="text-sm text-[var(--ink-soft)] mt-0.5">
                Lưu bộ lọc tìm kiếm của bạn - mỗi sáng có tin mới khớp, chúng tôi gửi thẳng vào email.
              </p>
            </div>
            <Link href="/search" className="btn btn-primary whitespace-nowrap rounded-xl px-5">
              Tạo thông báo ngay
            </Link>
          </section>

          {/* ===== Duyệt theo danh mục ===== */}
          <section className="mt-16">
            <h2 className="prata text-xl md:text-2xl mb-4 border-l-[3px] border-brand pl-3">Duyệt theo danh mục</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { kind: "nha", t: "Nhà Riêng", d: "Tìm ngôi nhà hoàn hảo cho gia đình", icon: HomeIcon },
                { kind: "can_ho", t: "Căn Hộ", d: "Cuộc sống đô thị tiện nghi & an ninh", icon: Building2 },
                { kind: "dat", t: "Đất Nền", d: "Đầu tư cho tương lai vững chắc", icon: LandPlot },
                { kind: "mat_bang", t: "Mặt Bằng", d: "Không gian kinh doanh chuyên nghiệp", icon: Store },
              ].map(({ kind, t, d, icon: Icon }) => (
                <Link
                  key={kind}
                  href={`/search?kind=${kind}`}
                  className="rounded-2xl p-6 bg-[#16233a] text-white hover:bg-[#1c2c48] transition-all group flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="prata text-xl mb-1 text-white group-hover:text-emerald-300 transition-colors">{t}</h3>
                    <p className="text-sm text-white/70 leading-relaxed">{d}</p>
                  </div>
                  <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-white/80 group-hover:text-white transition-colors">
                    <span>Xem danh sách</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
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
    <section className="mt-12">
      <div className="flex items-baseline gap-3 mb-4">
        <h2 className="prata text-xl md:text-2xl border-l-[3px] border-brand pl-3">{title}</h2>
        <Link href={href} className="group text-sm text-brand font-semibold ml-auto whitespace-nowrap inline-flex items-center gap-1">
          <span>Xem tất cả</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
      {children}
    </section>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  // "+" chỉ hợp lý với số lớn xấp xỉ; số nhỏ/đếm chính xác hiện đúng giá trị.
  return (
    <div className="px-3 py-2 rounded-xl bg-[var(--surface)] border border-[var(--line)] shadow-sm shrink-0">
      <div className="text-lg sm:text-xl font-extrabold text-brand tabular-nums">{n.toLocaleString("vi-VN")}</div>
      <div className="text-[0.7rem] sm:text-xs text-[var(--ink-soft)]">{label}</div>
    </div>
  );
}
