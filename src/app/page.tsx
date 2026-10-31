export const revalidate = 1800;

import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { createAnonClient } from "@/lib/supabase/anon";   // KHÔNG cookie -> trang cache được (23/9)
import { LISTING_COLS, LISTING_THE_COLS } from "@/lib/cols";
import ListingCard from "@/components/ListingCard";
import DaiDocQuyen from "@/components/DaiDocQuyen";
import TimPhongNhanh from "@/components/TimPhongNhanh";
import { NutZalo } from "@/components/TheoDoi";
import { HOTLINE_ZALO } from "@/lib/hotline";
import HangVuot from "@/components/HangVuot";
import HeroTimKiem, { type ChipKhuVuc } from "@/components/HeroTimKiem";
import { buildPlaces } from "@/lib/goi-y-noi";
import { laTinDocQuyen } from "@/lib/doc-quyen";
import { tronRoHang, laRoHang } from "@/lib/ro-hang";
import { BAI_VIET } from "@/lib/bai-viet";
import SafeImg from "@/components/SafeImg";
import { Sparkles, Calculator, Scale, BarChart3, BellRing, Home as HomeIcon, Building2, LandPlot, Store, ArrowRight, Clock, Calendar, Newspaper, ShieldCheck, Play, MessageCircle, SearchX } from "lucide-react";

// thứ hạng ưu tiên trong lưới kết quả: tin Zalo (0) -> rổ hàng Radar (1) -> tin FB (2) -> nguồn web (3)
const uuTienDocQuyen = (x: Listing) =>
  !laTinDocQuyen(x) ? 3 : (x.source_site || "").startsWith("zalo") || x.source === "zalo_oa" || x.source === "zalo_miniapp" ? 0 : laRoHang(x) ? 1 : 2;
import MapResults, { type MapItem } from "@/components/MapResults";
import { tinLenBanDo } from "@/lib/ban-do-tin";
import { fmtPrice, PROP } from "@/lib/format";
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
      supabase.from("projects").select("*", { count: "exact" }).eq("status", "published").not("images", "eq", "{}")   // 25/10: bỏ dự án không ảnh
        .order("priority", { ascending: false }).order("name").limit(6),
    ]);
    return { data: tronRoHang((rhData ?? []) as { id: string }[], (data ?? []) as { id: string }[]), projData: projData ?? [], projectCount: projectCount ?? 0 };
  },
  ["home-listings-v7"],
  { revalidate: 1800, tags: ["listings"] },   // 30 phút (2/10, egress): mỗi lần làm mới kéo 250 tin
);

// Title/description có SỐ THẬT (số tin, số tỉnh) thay vì câu quảng cáo chung chung - dữ liệu lấy từ
// cây khu vực đã cache 10 phút nên không thêm truy vấn (23/9).
export async function generateMetadata() {
  try {
    const { total, districtCount, sources } = await getAreas();
    return {
      title: `NhaDat Radar - ${total.toLocaleString("vi-VN")} tin nhà đất bán & cho thuê giá thật`,
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

export default async function Home() {
  const { data, projData, projectCount } = await layTinTrangChu();
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
  // Gợi ý ô tìm kiếm (28/10): tỉnh + quận của 5 tỉnh trong ô chọn - đủ cho gõ sai tên quận, không kéo cả cây phường
  // (~20k tên) vào HTML trang chủ tĩnh. Trang /search vẫn gợi ý tới cấp phường.
  // DB còn biến thể tên quận ("Q. Bình Thạnh" lẫn "Quận Bình Thạnh") -> mỗi tên chỉ giữ biến thể nhiều tin nhất,
  // không thì gợi ý xếp "Q. Bình Thạnh" (vài tin) lên trước vì tên ngắn hơn.
  const loiQuan = (d: string) => d.toLowerCase().replace(/^(quận|q\.|huyện|h\.|thị xã|tx\.|thành phố|tp\.)\s*/, "").trim();
  const goiY = buildPlaces(Object.fromEntries(["Hồ Chí Minh", "Hà Nội", "Đà Nẵng", "Bình Dương", "Đồng Nai"]
    .filter((p) => areas.geo[p]).map((p) => {
      const so = (d: string) => { const c = areas.counts[p]?.districts[d]; return c ? c.ban + c.cho_thue : 0; };
      const tot = new Map<string, string>();
      for (const d of Object.keys(areas.geo[p])) { const k = loiQuan(d), cu = tot.get(k); if (!cu || so(d) > so(cu)) tot.set(k, d); }
      return [p, Object.fromEntries([...tot.values()].map((d) => [d, [] as string[]]))];
    })));
  const hasFilter = false;
  const mapItems: MapItem[] = listings.flatMap(tinLenBanDo);

  const hero = HERO;
  return (
    <div>
      {/* ===== BANNER TIÊU ĐIỂM: NHÀ COMPOUND BÌNH PHÚ Q.6 (26/10) =====
          27/10 (anh Quang): đưa lên đầu trang, trên ô tìm kiếm. Máy tính: ảnh phủ tuyệt đối theo chiều cao phần chữ
          (~210px) - bản cũ ảnh tự cao ~430px, đặt ở đầu thì đẩy ô tìm kiếm xuống quá xa. */}
      {!hasFilter && (
        <section className="band-zalo mt-1 sm:mt-3 mb-4">
          <Link
            href="/listings/df3a7f4f-048a-4cce-a271-bc9c19ad32f5"
            className="group flex flex-col md:flex-row items-stretch overflow-hidden transition"
          >
            {/* Ảnh phòng khách thông tầng giếng trời */}
            <div className="relative md:w-5/12 h-40 sm:h-52 md:h-auto overflow-hidden shrink-0">
              <img
                src="https://nalcvzwsescsxfzsxirg.supabase.co/storage/v1/object/public/anh-zalo/hau-giang-q6/living-room.jpg"
                alt="Cho thuê nhà compound Bình Phú Quận 6"
                fetchPriority="high"
                className="w-full h-full md:absolute md:inset-0 object-cover group-hover:scale-105 transition duration-500"
              />
              <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-sm bg-amber-500 text-emerald-950 font-extrabold text-overline tracking-wide uppercase shadow-xs">
                ★ Tiêu điểm nổi bật
              </span>
            </div>

            {/* Nội dung thông tin & CTA */}
            <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Tin độc quyền xác minh thực tế
                  </span>
                  <span className="text-white/50 text-xs">·</span>
                  <span className="text-xs text-white/80">Đường Hậu Giang, P.11, Q.6</span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-white group-hover:text-emerald-300 transition leading-snug mb-2">
                  Cho thuê nhà compound Bình Phú · 60m² · 4 tầng · Xe hơi vô nhà
                </h2>
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-white/90 mb-3">
                  <span className="px-2 py-0.5 rounded-sm bg-emerald-950/70 border border-emerald-400/25 text-white font-medium">3 Phòng ngủ</span>
                  <span className="px-2 py-0.5 rounded-sm bg-emerald-950/70 border border-emerald-400/25 text-white font-medium">3 WC</span>
                  <span className="px-2 py-0.5 rounded-sm bg-emerald-950/70 border border-emerald-400/25 text-white font-medium">Đường 10m</span>
                  <span className="px-2 py-0.5 rounded-sm bg-emerald-950/70 border border-emerald-400/25 text-white font-medium">Full nội thất</span>
                  <span className="px-2 py-0.5 rounded-sm bg-emerald-950/70 border border-emerald-400/25 text-white font-medium">Cạnh CV Phú Lâm</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2.5 border-t border-white/15 mt-auto">
                <div>
                  <div className="text-overline uppercase tracking-wider text-white/65">Giá thuê trực tiếp</div>
                  <div className="text-lg sm:text-xl font-extrabold text-amber-400">
                    24 triệu<span className="text-xs font-normal text-white/80">/tháng</span>
                  </div>
                </div>
                <span className="btn !py-2 !px-4 text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-emerald-950 border-emerald-400 rounded-md transition inline-flex items-center gap-1.5 shadow-xs">
                  <span>Xem nhà ngay</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* ===== HERO: Sàn thực tế ===== */}
      <section className="hero-radar-bg px-3.5 pt-2.5 pb-4 sm:p-6 mb-4">
        {/* Vòng sóng Radar trang trí góc phải (chỉ hiện trên sm+, aria-hidden để bỏ qua kiểm tra chồng lấp) */}
        <svg
          aria-hidden="true"
          viewBox="0 0 240 240"
          className="hidden sm:block pointer-events-none absolute -top-12 -right-12 w-64 h-64 text-brand/15"
          fill="none"
        >
          <circle cx="120" cy="120" r="40" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 4" />
          <circle cx="120" cy="120" r="75" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="120" cy="120" r="110" stroke="currentColor" strokeWidth="1" strokeDasharray="6 6" />
          <line x1="120" y1="0" x2="120" y2="240" stroke="currentColor" strokeWidth="1" />
          <line x1="0" y1="120" x2="240" y2="120" stroke="currentColor" strokeWidth="1" />
        </svg>

        <div className="relative z-10">
          <Link
            href="/search?deal=cho_thue"
            title="Xem danh sách hơn 1.380 phòng trống mới cập nhật hôm nay"
            className="inline-flex items-center gap-2 px-2.5 py-1 rounded-sm bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300/80 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 hover:border-emerald-500 text-xs font-bold mb-2.5 shadow-2xs group transition-all"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {/* mobile: 1 dòng ngắn (câu dài cũ rớt 2 dòng, đẩy ô tìm kiếm xuống) */}
            <span className="sm:hidden">1.380+ phòng trống mới hôm nay</span>
            <span className="hidden sm:inline">Hệ thống vừa cập nhật 1.380+ phòng trống hôm nay (Xác minh trực tiếp)</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform opacity-70 group-hover:opacity-100" />
          </Link>

          <h1 className={`heading-1 mb-2.5 sm:mb-3 text-[var(--ink)] tracking-tight text-balance ${hasFilter ? "text-xl md:text-2xl" : "text-h2 sm:!text-3xl md:!text-4xl"}`}>
            Sàn Nhà Đất &amp; Phòng Trọ <span className="text-brand">Xác Minh Thực Tế</span>
          </h1>
          {/* mobile: ẩn đoạn giới thiệu - để ô tìm kiếm lên màn hình đầu (ZEN: gọn trên điện thoại) */}
          <p className="hidden sm:block text-base text-[var(--ink-soft)] mb-5 max-w-2xl leading-relaxed">
            Hơn 14.000 căn phòng và nhà đất có video thực tế, định vị chuẩn xác và cam kết giá thuê trực tiếp từ chủ nhà, không tin ảo kê giá.
          </p>
          <HeroTimKiem chip={chip} places={goiY} />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-3.5 sm:mt-5 text-xs">
            <Link
              href="/search?own=1"
              title="Xem danh sách tin đã xác minh thực tế"
              className="p-2.5 sm:p-3 rounded-sm border border-[var(--line)] border-t-2 border-t-emerald-500 bg-[var(--surface)] flex items-center gap-2 sm:gap-2.5 shadow-2xs hover:border-brand hover:shadow-xs transition group cursor-pointer"
            >
              <div className="w-7 h-7 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <ShieldCheck className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-[var(--ink)] group-hover:text-brand text-xs sm:text-sm leading-tight transition-colors">100% Tin xác minh</div>
                <div className="hidden sm:block text-overline text-[var(--ink-faint)] font-normal normal-case tracking-normal truncate">Tự động gỡ phòng đã thuê</div>
              </div>
            </Link>
            <Link
              href="/search?deal=cho_thue&ti=video"
              title="Xem các phòng có video quay thực tế"
              className="p-2.5 sm:p-3 rounded-sm border border-[var(--line)] border-t-2 border-t-rose-500 bg-[var(--surface)] flex items-center gap-2 sm:gap-2.5 shadow-2xs hover:border-rose-500 hover:shadow-xs transition group cursor-pointer"
            >
              <div className="w-7 h-7 rounded-md bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Play className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-[var(--ink)] group-hover:text-rose-600 dark:group-hover:text-rose-400 text-xs sm:text-sm leading-tight transition-colors">Có video thực tế</div>
                <div className="hidden sm:block text-overline text-[var(--ink-faint)] font-normal normal-case tracking-normal truncate">Xem phòng &amp; hẻm trước</div>
              </div>
            </Link>
            <Link
              href="/dinh-gia"
              title="Tra cứu giá thị trường và lịch sử giao dịch BĐS"
              className="p-2.5 sm:p-3 rounded-sm border border-[var(--line)] border-t-2 border-t-amber-500 bg-[var(--surface)] flex items-center gap-2 sm:gap-2.5 shadow-2xs hover:border-amber-500 hover:shadow-xs transition group cursor-pointer"
            >
              <div className="w-7 h-7 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Store className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-[var(--ink)] group-hover:text-amber-600 dark:group-hover:text-amber-400 text-xs sm:text-sm leading-tight transition-colors">Đúng giá chủ nhà</div>
                <div className="hidden sm:block text-overline text-[var(--ink-faint)] font-normal normal-case tracking-normal truncate">Không chênh giá môi giới</div>
              </div>
            </Link>
            <a
              href={HOTLINE_ZALO}
              target="_blank"
              rel="noopener noreferrer"
              title="Chat Zalo hoặc gọi hotline tư vấn 24/7"
              className="p-2.5 sm:p-3 rounded-sm border border-[var(--line)] border-t-2 border-t-blue-500 bg-[var(--surface)] flex items-center gap-2 sm:gap-2.5 shadow-2xs hover:border-blue-500 hover:shadow-xs transition group cursor-pointer"
            >
              <div className="w-7 h-7 rounded-md bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Clock className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-[var(--ink)] group-hover:text-blue-600 dark:group-hover:text-blue-400 text-xs sm:text-sm leading-tight transition-colors">Hỗ trợ 24/7</div>
                <div className="hidden sm:block text-overline text-[var(--ink-faint)] font-normal normal-case tracking-normal truncate">Hotline: 0387 365 020</div>
              </div>
            </a>
          </div>
        </div>
      </section>

      {hasFilter ? (
        <section className="mt-2">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="prata text-xl">{listings.length} kết quả</h2>
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
                <div className="band-spotlight p-6 sm:p-8 text-center max-w-xl mx-auto my-6">
                  <div className="w-12 h-12 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto mb-3.5 shadow-2xs">
                    <SearchX className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <h3 className="font-bold text-base sm:text-lg mb-1.5 text-[var(--ink)]">
                    Khu vực này hiện đang hiếm phòng trống
                  </h3>
                  <p className="text-[var(--ink-soft)] text-xs sm:text-sm mb-4 leading-relaxed max-w-md mx-auto">
                    Các phòng phù hợp có thể vừa được thuê hoặc tiêu chí đang lọc quá hẹp. Nhắn Zalo để chuyên viên Radar tìm căn mới và giữ chỗ ngay cho bạn trong 15 phút:
                  </p>
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                    <NutZalo
                      tinNhan="Chào Radar, mình đang cần tìm phòng phù hợp nhưng trên web đang hết căn khớp. Nhờ chuyên viên hỗ trợ tìm và giữ chỗ phòng mới giúp mình nhé!"
                      href={HOTLINE_ZALO}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto btn btn-primary px-4 py-2 text-xs font-bold rounded-md inline-flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <MessageCircle className="w-4 h-4 fill-current shrink-0" />
                      <span>Nhắn Zalo nhờ Radar giữ chỗ phòng mới (15 phút)</span>
                    </NutZalo>
                    <Link
                      href="/"
                      className="w-full sm:w-auto btn px-4 py-2 text-xs rounded-md border border-[var(--line-strong)] text-[var(--ink-soft)] hover:text-brand"
                    >
                      Xóa bộ lọc
                    </Link>
                  </div>
                </div>
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
          {/* 1. Dải độc quyền (FB + Zalo, tin Zalo trước) đứng đầu trang chủ - xem ngay sản phẩm thật sau Hero */}
          <DaiDocQuyen listings={listings} />

          {/* 2. Mồi câu giữ chân & kích hoạt chuyển đổi Zalo trong 15 phút (xuất hiện sau khi khách đã thấy hàng thật) */}
          <TimPhongNhanh />

          {projects.length > 0 && (
            <Section title="Dự án nổi bật" href="/projects">
              <HangVuot motHang items={projects.slice(0, 4).map((p) => ({ key: p.id, node: (
                  <Link href={`/projects/${p.id}`} className="card rounded-lg overflow-hidden transition-all duration-200 group w-full border border-[var(--line)]">
                    {/* Ảnh chiếm ~2/3 card (16:10), mô tả gọn 1 khối - ảnh là thứ bán dự án */}
                    <div className="aspect-[16/10] bg-dark-stage grid place-items-center overflow-hidden">
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
                <HangVuot motHang items={items.map((x) => ({ key: x.id, node: <ListingCard x={x} /> }))} />
              </Section>
            );
          })}

          {/* ===== Bộ công cụ thực tế cho người tìm nhà ===== */}
          <section className="mt-14">
            <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
              <div>
                <h2 className="heading-2 border-l-4 border-brand pl-3.5 text-[var(--ink)]">Công cụ phân tích &amp; Định giá BĐS</h2>
                <p className="text-xs sm:text-sm text-[var(--ink-soft)] pl-4 mt-1">Dữ liệu thực tế hỗ trợ ra quyết định thuê, mua và tính dòng tiền chuẩn xác</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { href: "/dinh-gia", icon: Sparkles, t: "Định Giá Nhà Đất", d: "Tra cứu giá thị trường theo m² từ dữ liệu giao dịch mới nhất", tag: "Tra cứu nhanh", border: "border-t-2 border-t-emerald-500", iconCls: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 group-hover:bg-brand group-hover:text-white" },
                { href: "/tinh-lai-vay", icon: Calculator, t: "Bảng Tính Lãi Vay", d: "Tính số tiền gốc và lãi trả góp hàng tháng theo các gói ngân hàng", tag: "Tài chính", border: "border-t-2 border-t-amber-500", iconCls: "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 group-hover:bg-amber-500 group-hover:text-white" },
                { href: "/thue-hay-mua", icon: Scale, t: "So Sánh Thuê Hay Mua", d: "Phân tích bài toán dòng tiền và tích luỹ nhà ở cho gia đình trẻ", tag: "Lời khuyên", border: "border-t-2 border-t-blue-500", iconCls: "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white" },
                { href: "/thong-ke", icon: BarChart3, t: "Bản Đồ Giá BĐS", d: "Biến động giá bán và cho thuê thực tế tại các quận huyện TP.HCM", tag: "Thị trường", border: "border-t-2 border-t-rose-500", iconCls: "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 group-hover:bg-rose-600 group-hover:text-white" },
              ].map(({ href, icon: Icon, t, d, tag, border, iconCls }) => (
                <Link
                  key={href}
                  href={href}
                  className={`card rounded-lg p-4 sm:p-5 transition-all group flex flex-col justify-between ${border}`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`w-9 h-9 rounded-md flex items-center justify-center transition-colors ${iconCls}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-overline font-bold uppercase tracking-wider px-2 py-0.5 rounded-sm bg-[var(--surface-2)] text-[var(--ink-soft)]">
                        {tag}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-[var(--ink)] group-hover:text-brand transition-colors">
                      {t}
                    </h3>
                    <p className="text-xs text-[var(--ink-soft)] mt-1.5 leading-relaxed">
                      {d}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-brand">
                    <span>Xem chi tiết</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* ===== Trợ lý Zalo: Nhận bảng hàng giá tốt mới nhất ===== */}
          <section className="mt-10 sm:mt-12 band-spotlight p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div className="w-11 h-11 rounded-md bg-brand text-white flex items-center justify-center shrink-0 shadow-xs">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h3 className="heading-3 text-[var(--ink)]">Nhận danh sách căn giá tốt nhất qua Zalo</h3>
              <p className="text-xs sm:text-sm text-[var(--ink-soft)] mt-1 leading-relaxed">
                Chuyên viên Radar lọc sẵn 3–5 căn sát nhu cầu, đúng giá chủ nhà và gửi kèm ảnh/sổ hồng trực tiếp qua Zalo trong 15 phút.
              </p>
            </div>
            <NutZalo
              tinNhan="Chào Radar, mình cần tìm bất động sản phù hợp, nhờ bạn tư vấn giúp nhé!"
              href={HOTLINE_ZALO}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary whitespace-nowrap px-5 py-2.5 rounded-md font-bold text-sm shrink-0 shadow-xs"
            >
              Nhận tư vấn Zalo miễn phí
            </NutZalo>
          </section>

          {/* ===== Duyệt theo danh mục ===== */}
          <section className="mt-10 sm:mt-12">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="heading-2 border-l-4 border-brand pl-3 text-[var(--ink)]">Duyệt theo danh mục</h2>
              <span className="text-xs sm:text-sm text-[var(--ink-faint)] font-medium">Hơn 15.000 căn nhà đất có sẵn</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { 
                  kind: "nha", 
                  t: "Nhà Riêng", 
                  d: "Nhà phố, biệt thự, nhà hẻm ô tô đầy đủ tiện nghi", 
                  icon: HomeIcon, 
                  img: "/categories/nha-rieng.jpg" 
                },
                { 
                  kind: "can_ho", 
                  t: "Căn Hộ", 
                  d: "Chung cư, studio & căn hộ dịch vụ trung tâm", 
                  icon: Building2, 
                  img: "/categories/can-ho.jpg" 
                },
                { 
                  kind: "dat", 
                  t: "Đất Nền", 
                  d: "Đất thổ cư phân lô, sổ đỏ trao tay chính chủ", 
                  icon: LandPlot, 
                  img: "/categories/dat-nen.jpg" 
                },
                { 
                  kind: "mat_bang", 
                  t: "Mặt Bằng", 
                  d: "Mặt tiền kinh doanh sầm uất, shophouse đắc địa", 
                  icon: Store, 
                  img: "/categories/mat-bang.jpg" 
                },
              ].map(({ kind, t, d, icon: Icon, img }) => (
                <Link
                  key={kind}
                  href={`/search?kind=${kind}`}
                  className="relative rounded-lg overflow-hidden min-h-[240px] group flex flex-col justify-between p-4 sm:p-5 text-white shadow-sm hover:shadow-md transition-all duration-300 border border-[var(--line)]"
                >
                  {/* Ảnh nền thực tế */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img}
                    alt={t}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Lớp phủ gradient tạo độ tương phản đọc chữ sắc nét */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/45 to-black/25 group-hover:via-black/55 transition-colors" />

                  {/* Header thẻ: Icon danh mục */}
                  <div className="relative z-10 flex items-center justify-between">
                    <div className="w-9 h-9 rounded-md badge-glass-dark flex items-center justify-center group-hover:bg-brand group-hover:border-brand transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Footer thẻ: Tiêu đề & mô tả */}
                  <div className="relative z-10">
                    <h3 className="heading-3 text-white group-hover:text-emerald-300 transition-colors drop-shadow">
                      {t}
                    </h3>
                    <p className="text-xs text-white/85 mt-1.5 leading-relaxed drop-shadow line-clamp-2">
                      {d}
                    </p>
                    <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-white/95 group-hover:text-emerald-300 transition-colors">
                      <span>Khám phá ngay</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* ===== Tin tức & Cẩm nang Bất Động Sản ===== */}
          <section className="mt-12 sm:mt-16">
            <div className="flex items-center justify-between gap-3 mb-6">
              <div>
                <h2 className="heading-2 border-l-4 border-brand pl-3.5 text-[var(--ink)]">Tin tức &amp; Cẩm nang thị trường</h2>
                <p className="text-xs sm:text-sm text-[var(--ink-faint)] pl-4 mt-1">Kiến thức pháp lý, quy hoạch, lãi suất vay và kinh nghiệm giao dịch BĐS</p>
              </div>
              <Link href="/tin-tuc" className="group text-sm text-brand font-semibold ml-auto whitespace-nowrap inline-flex items-center gap-1">
                <span>Xem tất cả tin tức</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {BAI_VIET.slice(0, 4).map((b) => (
                <Link
                  key={b.slug}
                  href={`/tin-tuc/${b.slug}`}
                  className="group card rounded-lg overflow-hidden transition-all duration-200 flex flex-col justify-between"
                >
                  <div>
                    <div className="aspect-[16/10] relative overflow-hidden bg-[var(--surface-2)]">
                      <SafeImg
                        src={b.coverImage}
                        alt={b.tieuDe}
                        fallbackLabel={b.categoryName}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <span className="absolute top-2.5 left-2.5 px-1.5 py-0.5 rounded-sm text-overline font-bold badge-glass-dark shadow-xs">
                        {b.categoryName}
                      </span>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2 text-overline text-[var(--ink-faint)] mb-1.5 font-medium normal-case tracking-normal">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-[var(--ink-faint)]" /> {b.readTime}</span>
                        <span>·</span>
                        <span>{b.ngay}</span>
                      </div>
                      <h3 className="font-bold text-[var(--ink)] group-hover:text-brand transition-colors line-clamp-2 leading-snug text-sm">
                        {b.tieuDe}
                      </h3>
                      <p className="text-xs text-[var(--ink-soft)] line-clamp-2 mt-1.5 leading-relaxed">
                        {b.moTa}
                      </p>
                    </div>
                  </div>
                  <div className="p-4 pt-0 flex items-center justify-between text-xs font-semibold text-brand">
                    <span>Đọc tiếp</span>
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
    <section className="mt-12 sm:mt-16">
      <div className="flex items-center justify-between gap-3 mb-4 sm:mb-6">
        <div className="flex items-center gap-2.5">
          <span className="w-1.5 h-6 rounded-sm bg-gradient-to-b from-brand to-amber-500 shrink-0" />
          <h2 className="heading-2 text-[var(--ink)]">{title}</h2>
        </div>
        <Link href={href} className="group text-sm text-brand font-bold ml-auto whitespace-nowrap inline-flex items-center gap-1 hover:text-brand-ink transition-colors">
          <span>Xem tất cả</span>
          <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
      {children}
    </section>
  );
}

function Stat({ n, label }: { n: number; label: string }) {
  // "+" chỉ hợp lý với số lớn xấp xỉ; số nhỏ/đếm chính xác hiện đúng giá trị.
  return (
    <div className="px-3 py-2 rounded-lg bg-[var(--surface)] border border-[var(--line)] shadow-sm shrink-0">
      <div className="text-lg sm:text-xl font-extrabold text-brand tabular-nums">{n.toLocaleString("vi-VN")}</div>
      <div className="text-overline sm:text-xs text-[var(--ink-soft)] normal-case tracking-normal">{label}</div>
    </div>
  );
}
