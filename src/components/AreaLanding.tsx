// Trang SEO khu vực: /nha-dat-ban/[tinh]/[quan] & /nha-dat-cho-thue/[tinh]/[quan]
// (học batdongsan: URL theo khu vực + H1 động + "N tin"; học homigo: tóm tắt thị trường tự sinh từ dữ liệu + FAQ + JSON-LD).
// MỌI con số đều tính từ listings đang published - không hardcode.
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";   // chỉ đọc published trong cache chung -> tránh timeout 3s anon lúc cold burst (23/9, 11/11)
import { unstable_cache } from "next/cache";
import { fmtPrice, fmtPpm2, PROP, startOfDayVN, tenKhuVucGon } from "@/lib/format";
import { median, percentile } from "@/lib/gemini";
import { slugify, areaPath, DEAL_WORD, KIND_SLUG, kindFromSlug } from "@/lib/slug";
import { getAreas } from "@/lib/geo";
import { truyVanVoiRetry } from "@/lib/cols";
import type { Listing } from "@/lib/types";
import ListingRow from "@/components/ListingRow";
import DaiDocQuyen, { locDocQuyen } from "@/components/DaiDocQuyen";
import PriceTrend from "@/components/PriceTrend";
import { cheSoTin } from "@/lib/doc-quyen";
import { tronRoHang } from "@/lib/ro-hang";
import { ldJson, SITE_URL } from "@/lib/ld";
import { NGUONG, robotsTheoSoTin, BO_LOC_SEO, boLocTuSlug, TIN_MOI_TRANG, TRANG_TINH_TOI_DA, type BoLocSlug } from "@/lib/seo-index";
import { DIEM_NEO } from "@/lib/diem-neo";
import { DANH_SACH_CHUYEN_DE } from "@/lib/chuyen-de";
import { BarChart3 } from "lucide-react";
import SanPhongHoCTA from "@/components/SanPhongHoCTA";

type Deal = "ban" | "cho_thue";
const SITE = SITE_URL;

/**
 * Tuần tự hoá JSON-LD an toàn để nhúng vào <script>.
 *
 * XSS LƯU TRỮ (review /ultrareview): JSON.stringify KHÔNG escape "<" hay "/", nên một tiêu đề tin
 * CÀO chứa "</script>" thoát ra khỏi thẻ script và chạy mã trên chính origin của site. Kiểm chứng:
 *   title = 'Bán nhà Q7 </script><img src=x onerror=alert(document.domain)>'
 *   JSON.stringify(o).includes("</script>") === true
 * Đường tấn công không cần tài khoản: đăng tin lên bất kỳ nguồn nào Radar cào (chotot/mogi/guland/
 * group Facebook) -> crawler nhận -> seed ghi vào DB -> MỌI trang khu vực render cho mọi khách.
 * Đây lại đúng là nhóm trang được index SEO nên có lưu lượng cao nhất, và script chạy cùng origin
 * nên đọc được phiên Supabase trong localStorage.
 * Escape sang \\u00XX: vẫn là JSON hợp lệ, trình duyệt vẫn parse đúng, mà không thoát được thẻ.
 */
// (thân hàm chuyển sang src/lib/ld.ts 23/9 để trang chi tiết tin dùng chung - import ở đầu file)

/** slug -> tên thật, dựa trên cây khu vực CACHE (lib/geo) - audit 16/8: bản cũ select 5.000 dòng x2 mỗi request (metadata + page) */
export type AreaInfo = { province: string; ban: number; cho_thue: number; kinds: Record<string, { ban: number; cho_thue: number }>; districts: Record<string, { ban: number; cho_thue: number; kinds: Record<string, { ban: number; cho_thue: number }> }> };
export async function resolveArea(provinceSlug: string, districtSlug?: string): Promise<{ province: string; district: string | null; area: AreaInfo } | null> {
  const { counts } = await getAreas();
  const provName = Object.keys(counts).find((p) => slugify(p) === provinceSlug);
  if (!provName) return null;
  const area: AreaInfo = { province: provName, ...counts[provName] };
  if (!districtSlug) return { province: provName, district: null, area };
  const dist = Object.keys(area.districts).find((d) => slugify(d) === districtSlug);
  if (!dist) return null;
  return { province: provName, district: dist, area };
}

// SEO (2/10): tiêu đề theo CÁCH KHÁCH GÕ trên Google ("phòng trọ gò vấp giá rẻ", "cho thuê căn hộ dịch vụ quận 7")
// thay vì "Cho thuê Phòng trọ Quận Gò Vấp, Hồ Chí Minh". Tên quận gọn ("Gò Vấp", giữ "Quận 7"), có số phòng thật
// + ngày cập nhật (Google hay hiện nguyên tiêu đề, số + ngày làm tăng tỉ lệ bấm).
// 2/11 (audit): tenKhuVucGon chuyển sang @/lib/format - client component (TinTucClient) không kéo file này nữa
const ngayVN = () => {
  const [d, m] = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }).split("/");
  return `${d}/${m}`;
};
export function areaH1(deal: Deal, province: string, district: string | null, n: number, kind?: string | null) {
  // trang quận: chỉ tên quận (khách gõ "phòng trọ gò vấp", không kèm tỉnh); trang tỉnh: tên tỉnh
  const where = district ? tenKhuVucGon(district) : province;
  const so = n.toLocaleString("vi-VN");
  if (deal === "cho_thue" && kind === "phong_tro") return `Phòng trọ ${where} giá rẻ - ${so} phòng trống`;
  if (deal === "cho_thue" && kind === "can_ho") return `Cho thuê căn hộ dịch vụ, studio ${where} - ${so} căn`;
  if (deal === "cho_thue" && !kind) return `Cho thuê phòng trọ, căn hộ, nhà ${where} - ${so} tin`;
  const what = kind ? (PROP[kind] || kind).toLowerCase() : "nhà đất";
  return `${DEAL_WORD[deal]} ${what} ${where} - ${so} tin`;
}
export function areaTitle(deal: Deal, province: string, district: string | null, n: number, kind?: string | null) {
  return `${areaH1(deal, province, district, n, kind)}, cập nhật ${ngayVN()} | NhaDat Radar`;
}

/** Số tin của một khu vực (có thể lọc theo loại BĐS) - dùng cho metadata + sitemap */
export function areaCount(area: AreaInfo, deal: Deal, district?: string | null, kind?: string | null): number {
  const node = district ? area.districts[district] : area;
  if (!node) return 0;
  return kind ? (node.kinds?.[kind]?.[deal] ?? 0) : node[deal];
}

/**
 * Metadata dùng chung cho 6 route khu vực (bán/thuê x tỉnh/quận/loại) - trước đây mỗi file tự viết
 * tay title + description + canonical nên dễ trôi khỏi nhau.
 * kindSlug không hợp lệ -> trả null để route tự notFound.
 */
export async function areaMeta(
  deal: Deal,
  provinceSlug: string,
  districtSlug?: string,
  kindSlug?: string,
  boLocSlug?: string,
  trang = 1,
) {
  const kind = kindFromSlug(kindSlug);
  if (kindSlug && !kind) return { title: "Không tìm thấy khu vực - NhaDat Radar" };
  const boLocCfg = boLocTuSlug(boLocSlug);
  if (boLocSlug && !boLocCfg) return { title: "Không tìm thấy bộ lọc - NhaDat Radar" };
  const r = await resolveArea(provinceSlug, districtSlug);
  if (!r || (districtSlug && !r.district)) return { title: "Không tìm thấy khu vực - NhaDat Radar" };
  const basePath = areaPath(deal, r.province, r.district, kind);
  const where = r.district ? `${r.district}, ${r.province}` : r.province;
  const what = kind ? (PROP[kind] || kind).toLowerCase() : "nhà đất";
  const hanhDong = deal === "ban" ? "bán" : "cho thuê";

  if (boLocSlug && boLocCfg && r.district && kind) {
    const { total } = await layTinBoLoc(deal, r.province, r.district, kind, boLocSlug);
    const so = total.toLocaleString("vi-VN");
    const whereShort = tenKhuVucGon(r.district);
    const title = `Phòng trọ ${whereShort} ${boLocCfg.nhan} - ${so} phòng trống, cập nhật ${ngayVN()} | NhaDat Radar`;
    const description = `${so} ${what} ${boLocCfg.nhan} cho thuê tại ${where}: ảnh thật, 5 khoản phí minh bạch, hẹn xem miễn phí hằng ngày.`;
    return {
      title,
      description,
      alternates: { canonical: `${basePath}/${boLocSlug}` },
      robots: robotsTheoSoTin(total, NGUONG.boLoc),
    };
  }

  const n = areaCount(r.area, deal, r.district, kind);
  const so = n.toLocaleString("vi-VN");
  const description = deal === "cho_thue" && (kind === "phong_tro" || kind === "can_ho" || !kind)
    ? `${so} ${kind === "can_ho" ? "căn hộ dịch vụ, studio" : "phòng trọ, căn hộ mini"} cho thuê tại ${where}: ảnh thật, giá rõ ràng, phòng trống đã xác thực. Studio, gác lửng, duplex, có máy lạnh, giờ tự do. Bấm xem số, hẹn xem phòng miễn phí - cập nhật mỗi ngày.`
    : `${so} tin ${hanhDong} ${what} tại ${where}: giá phổ biến và trung vị theo m², xu hướng giá, cảnh báo giá lệch, dấu hiệu môi giới/chính chủ và nguồn của từng tin. Cập nhật hằng ngày trên NhaDat Radar.`;
  const nguong = kind ? NGUONG.loai : r.district ? NGUONG.quan : NGUONG.tinh;
  if (trang > 1) {
    return {
      title: `${areaH1(deal, r.province, r.district, n, kind)} - Trang ${trang} | NhaDat Radar`,
      description,
      alternates: { canonical: `${basePath}/trang/${trang}` },
      robots: { index: false, follow: true },
    };
  }
  return {
    title: areaTitle(deal, r.province, r.district, n, kind),
    description,
    alternates: { canonical: basePath },
    robots: robotsTheoSoTin(n, nguong),
  };
}

const fmtP = (v: number, deal: Deal) => fmtPrice(v, deal);
// cột thật sự dùng (ListingRow + số liệu) thay vì select("*")
const COLS = "id,source,source_site,source_url,deal,kind,title,description,price_vnd,area_m2,price_per_m2,bedrooms,bathrooms,province,district,ward,images,ai_score,poster_role_guess,price_flag,first_seen_at,source_count,source_sites,status";

/**
 * Truy vấn tin của một khu vực, CÓ CACHE 10 phút (unstable_cache).
 * Next 15 không cache fetch mặc định nữa -> mỗi lượt xem trang khu vực là 2 truy vấn Supabase, và
 * route bị coi là động nên không bao giờ được cache (đo 23/9: mọi phản hồi "no-store", TTFB 0,4-0,6s).
 * Dữ liệu chỉ đổi mỗi lượt crawl (4 tiếng) nên cache 10 phút là quá đủ.
 */
const layTinKhuVuc = unstable_cache(
  async (deal: Deal, province: string, district: string | null, kind: string | null) => {
    const supabase = createAdminClient();
    // builder bị mutate khi gọi filter -> dựng mới cho từng truy vấn
    const taoQ = () => {
      let q = supabase.from("listings").select(COLS).eq("status", "published").eq("deal", deal).eq("province", province);
      if (district) q = q.eq("district", district);
      if (kind) q = q.eq("kind", kind);
      return q;
    };
    const COT_TK = "id,source,source_site,kind,district,price_vnd,price_per_m2,poster_role_guess";
    const taoTk = () => {
      let q = supabase.from("listings").select(COT_TK).eq("status", "published").eq("deal", deal).eq("province", province);
      if (district) q = q.eq("district", district);
      if (kind) q = q.eq("kind", kind);
      return q;
    };
    const taoDem = () => {
      let q = supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "published").eq("deal", deal).eq("province", province);
      if (district) q = q.eq("district", district);
      if (kind) q = q.eq("kind", kind);
      return q;
    };
    let c = supabase.from("listings").select("id", { count: "exact", head: true })
      .eq("status", "published").eq("deal", deal).eq("province", province).gte("first_seen_at", startOfDayVN());
    if (district) c = c.eq("district", district);
    if (kind) c = c.eq("kind", kind);
    // 28/9: rổ hàng Radar trộn 2:1 với tin còn lại (lib/ro-hang)
    // EGRESS (2/10): trước đây kéo 420 tin ĐẦY ĐỦ (mô tả + mảng ảnh) mỗi khu vực mỗi 10 phút để hiện 20 tin -
    // bot quét ~7.400 trang khu vực là vài GB. Giờ tách: 40 tin đầy đủ để HIỂN THỊ + 420 tin chỉ cột số liệu
    // (giá, loại, quận, nguồn) để tính thống kê + đếm tin có ảnh bằng count (không tải ảnh).
    const moi = { ascending: false } as const;
    const [rhRes, tinRes, rhTkRes, tkRes, newRes, anhRes] = await Promise.all([
      truyVanVoiRetry(() => taoQ().eq("source", "ro_hang").order("first_seen_at", moi).limit(30), `area:${deal}:${province}:rh`),
      truyVanVoiRetry(() => taoQ().neq("source", "ro_hang").order("first_seen_at", moi).limit(40), `area:${deal}:${province}:tin`),
      truyVanVoiRetry(() => taoTk().eq("source", "ro_hang").order("first_seen_at", moi).limit(120), `area:${deal}:${province}:rhtk`),
      truyVanVoiRetry(() => taoTk().neq("source", "ro_hang").order("first_seen_at", moi).limit(300), `area:${deal}:${province}:tk`),
      truyVanVoiRetry(() => c, `area:${deal}:${province}:new`),
      truyVanVoiRetry(() => taoDem().neq("images", "{}"), `area:${deal}:${province}:img`),
    ]);
    return {
      hien: tronRoHang((rhRes.data ?? []) as { id: string }[], (tinRes.data ?? []) as { id: string }[]).slice(0, 40),
      data: tronRoHang((rhTkRes.data ?? []) as { id: string }[], (tkRes.data ?? []) as { id: string }[]).slice(0, 300),
      newToday: newRes.count ?? 0,
      coAnh: anhRes.count ?? 0,
    };
  },
  ["area-listings-v5"],
  { revalidate: 21600, tags: ["listings", "ds-tin"] },
);

const layTinBoLoc = unstable_cache(
  async (deal: Deal, province: string, district: string, kind: string, boLocSlug: string) => {
    const cfg = boLocTuSlug(boLocSlug);
    const supabase = createAdminClient();
    const apLoc = <T extends { lte: (c: string, v: number) => T; or: (f: string) => T }>(q: T): T => {
      if (!cfg) return q;
      if ("priceMax" in cfg) return q.lte("price_vnd", cfg.priceMax);
      if ("tuKhoa" in cfg) return q.or(cfg.tuKhoa.map((k) => `title.ilike.%${k}%,description.ilike.%${k}%`).join(","));
      return q;
    };
    const COT_TK = "id,source,source_site,kind,district,price_vnd,price_per_m2,poster_role_guess";
    const taoQ = () => apLoc(supabase.from("listings").select(COLS).eq("status", "published").eq("deal", deal).eq("province", province).eq("district", district).eq("kind", kind));
    const taoTk = () => apLoc(supabase.from("listings").select(COT_TK).eq("status", "published").eq("deal", deal).eq("province", province).eq("district", district).eq("kind", kind));
    const taoDem = () => apLoc(supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "published").eq("deal", deal).eq("province", province).eq("district", district).eq("kind", kind));
    const moi = { ascending: false } as const;
    const [rhRes, tinRes, tkRes, totRes, newRes, anhRes] = await Promise.all([
      truyVanVoiRetry(() => taoQ().eq("source", "ro_hang").order("first_seen_at", moi).limit(20), `boloc:${boLocSlug}:rh`),
      truyVanVoiRetry(() => taoQ().neq("source", "ro_hang").order("first_seen_at", moi).limit(30), `boloc:${boLocSlug}:tin`),
      truyVanVoiRetry(() => taoTk().order("first_seen_at", moi).limit(300), `boloc:${boLocSlug}:tk`),
      truyVanVoiRetry(() => taoDem(), `boloc:${boLocSlug}:tot`),
      truyVanVoiRetry(() => taoDem().gte("first_seen_at", startOfDayVN()), `boloc:${boLocSlug}:new`),
      truyVanVoiRetry(() => taoDem().neq("images", "{}"), `boloc:${boLocSlug}:img`),
    ]);
    return {
      hien: tronRoHang((rhRes.data ?? []) as { id: string }[], (tinRes.data ?? []) as { id: string }[]).slice(0, 40),
      data: (tkRes.data ?? []) as { id: string }[],
      total: totRes.count ?? 0,
      newToday: newRes.count ?? 0,
      coAnh: anhRes.count ?? 0,
    };
  },
  ["area-filter-v2"],
  { revalidate: 43200, tags: ["listings"] },
);

const layTrangTinKhuVuc = unstable_cache(
  async (deal: Deal, province: string, district: string, kind: string, trang: number) => {
    const supabase = createAdminClient();
    const from = (trang - 1) * TIN_MOI_TRANG;
    const to = trang * TIN_MOI_TRANG - 1;
    const { data } = await truyVanVoiRetry(
      () =>
        supabase
          .from("listings")
          .select(COLS)
          .eq("status", "published")
          .eq("deal", deal)
          .eq("province", province)
          .eq("district", district)
          .eq("kind", kind)
          .order("first_seen_at", { ascending: false, nullsFirst: false })
          .order("id")
          .range(from, to),
      `slice:${district}:${trang}`,
    );
    return (data ?? []) as { id: string }[];
  },
  ["area-page-slice-v2"],
  { revalidate: 43200, tags: ["listings"] },
);

/** Trang cha gần nhất CÒN TIN: quận (cho trang loại BĐS) -> tỉnh -> trang mua/thuê toàn quốc */
function trangChaConTin(deal: Deal, area: AreaInfo, district: string | null, kind?: string | null): string {
  if (district && kind && areaCount(area, deal, district) > 0) return areaPath(deal, area.province, district);
  if (areaCount(area, deal) > 0) return areaPath(deal, area.province);
  return deal === "ban" ? "/nha-dat-ban" : "/nha-dat-cho-thue";
}

export default async function AreaLanding({
  deal,
  provinceSlug,
  districtSlug,
  kind,
  boLocSlug,
  trang = 1,
}: {
  deal: Deal;
  provinceSlug: string;
  districtSlug?: string;
  kind?: string | null;
  boLocSlug?: string;
  trang?: number;
}) {
  const boLocCfg = boLocTuSlug(boLocSlug);
  if (boLocSlug && !boLocCfg) notFound();
  const r = await resolveArea(provinceSlug, districtSlug);
  if (!r) {
    // 29/10 (Search Console): quận không còn trong cây khu vực (hết tin / xã cũ) trả 404 dù Google còn xếp hạng URL.
    // Tỉnh còn thì về trang tỉnh; tỉnh cũng không có mới 404. Chuyển hướng TẠM (307): nguồn tin đổi theo từng lượt crawl.
    const tinh = districtSlug ? await resolveArea(provinceSlug) : null;
    if (tinh) redirect(trangChaConTin(deal, tinh.area, null));
    notFound();
  }
  const { province, district, area } = r;
  // trang quận / loại BĐS chỉ có nội dung khi khu vực thực sự có tin: hết tin thì về trang cha còn tin thay vì 404 hay trang rỗng
  if ((kind || district) && areaCount(area, deal, district, kind) < 1) redirect(trangChaConTin(deal, area, district, kind));
  const kindWord = kind ? (PROP[kind] || kind) : null;
  const boLocRes = boLocSlug && district && kind ? await layTinBoLoc(deal, province, district, kind, boLocSlug) : null;
  const baseRes = boLocRes ?? (await layTinKhuVuc(deal, province, district, kind ?? null));
  const { data, newToday, coAnh } = baseRes;
  const trangSlice = trang > 1 && !boLocSlug && district && kind
    ? await layTrangTinKhuVuc(deal, province, district, kind, trang)
    : null;
  const hien = trangSlice ?? baseRes.hien;
  const rows = (data ?? []) as Listing[];                               // cột số liệu - để tính thống kê
  const hienRows = ((hien ?? []) as Listing[]).map(cheSoTin);     // tin đầy đủ - để hiển thị
  // tổng THẬT từ cây đếm (cache) - audit: bản cũ dùng rows.length bị cap 300 cho cấp quận
  const total = boLocRes ? boLocRes.total : (areaCount(area, deal, district, kind) || rows.length);
  if (trang > 1 && !hienRows.length) redirect(areaPath(deal, province, district, kind));

  // ---- Số liệu thị trường (thật) ----
  const prices = rows.map((x) => x.price_vnd).filter((v): v is number => !!v && v > 0);
  const ppm2 = rows.map((x) => Number(x.price_per_m2)).filter((v) => v > 0);
  const p25 = percentile(prices, 25), p75 = percentile(prices, 75), medPrice = median(prices), medPpm2 = median(ppm2);
  const byKind = new Map<string, number[]>();
  for (const x of rows) { if (x.price_vnd) { const a = byKind.get(x.kind) ?? []; a.push(x.price_vnd); byKind.set(x.kind, a); } }
  const kindStats = [...byKind.entries()].map(([k, arr]) => ({ kind: k, n: arr.length, med: median(arr)! })).filter((s) => s.n >= 3).sort((a, b) => b.n - a.n).slice(0, 4);
  // quận rẻ nhất (cấp tỉnh): median giá theo quận, cần ≥3 tin
  const byDist = new Map<string, number[]>();
  if (!district) for (const x of rows) { const d = x.district || ""; if (d && x.price_vnd) { const a = byDist.get(d) ?? []; a.push(x.price_vnd); byDist.set(d, a); } }
  const distStats = [...byDist.entries()].map(([d, arr]) => ({ d, n: arr.length, med: median(arr)! })).filter((s) => s.n >= 3).sort((a, b) => a.med - b.med);
  const cheapest = distStats.slice(0, 3), priciest = distStats.slice(-3).reverse();
  const brokers = rows.filter((x) => x.poster_role_guess === "moi_gioi").length, owners = rows.filter((x) => x.poster_role_guess === "chu_nha").length;
  const withImg = coAnh;
  const sources = [...new Set(rows.map((x) => x.source === "agent" ? "tự đăng" : x.source_site).filter(Boolean))];

  const where = district ? `${district}, ${province}` : province;
  const dealWord = DEAL_WORD[deal];
  const baseH1 = areaH1(deal, province, district, total, kind);
  const h1 = boLocCfg && district
    ? `Phòng trọ ${tenKhuVucGon(district)} ${boLocCfg.nhan} - ${total.toLocaleString("vi-VN")} phòng trống`
    : trang > 1
      ? `${baseH1} (Trang ${trang})`
      : baseH1;
  const monthLabel = `tháng ${new Date().getMonth() + 1}/${new Date().getFullYear()}`;
  // tin độc quyền hiện ở dải riêng đầu danh sách (chỉ ở trang 1 chưa phân trang) -> loại khỏi list thường cho khỏi lặp
  const idsDocQuyen = trang === 1 ? new Set(locDocQuyen(hienRows, 6).map((t) => t.id)) : new Set<string>();
  const show = trang === 1 ? hienRows.filter((r) => !idsDocQuyen.has(r.id)).slice(0, TIN_MOI_TRANG) : hienRows;
  const baseUrl = areaPath(deal, province, district, kind);
  const coPhanTrangTinh = deal === "cho_thue" && !!district && !!kind && !boLocSlug;
  const searchHref = `/search?deal=${deal}&province=${encodeURIComponent(province)}${district ? `&district=${encodeURIComponent(district)}` : ""}${kind ? `&kind=${kind}` : ""}`;
  const otherDeal: Deal = deal === "ban" ? "cho_thue" : "ban";
  const districts = Object.entries(area.districts).filter(([, c]) => c[deal] > 0).sort((a, b) => b[1][deal] - a[1][deal]);
  // Loại BĐS có thật trong khu vực này -> chip dẫn sang /nha-dat-ban/[tinh]/[quan]/[loai]
  const kindsHere = Object.entries((district ? area.districts[district]?.kinds : area.kinds) || {})
    .filter(([k, c]) => c[deal] >= 3 && KIND_SLUG[k]).sort((a, b) => b[1][deal] - a[1][deal]);
  // Quận lân cận (chỉ hiện ở trang cấp quận) - trước đây trang quận không link sang quận nào khác
  const quanKhac = district ? districts.filter(([d]) => d !== district).slice(0, 12) : [];

  // ---- FAQ sinh từ dữ liệu (chỉ hỏi câu có số liệu để trả lời) ----
  const faq: { q: string; a: string }[] = [];
  if (medPrice) faq.push({
    q: `Giá ${deal === "ban" ? "nhà đất" : "thuê nhà đất"} ${where} ${monthLabel} khoảng bao nhiêu?`,
    a: `Theo ${prices.length} tin đang hiển thị trên NhaDat Radar, giá phổ biến từ ${fmtP(p25!, deal)} đến ${fmtP(p75!, deal)}, trung vị ${fmtP(medPrice, deal)}${medPpm2 ? ` (khoảng ${fmtPpm2(medPpm2)})` : ""}. Số liệu tổng hợp từ tin rao, chỉ mang tính tham khảo, không phải định giá.`,
  });
  if (kindStats.length) faq.push({
    q: `Loại hình nào được ${deal === "ban" ? "rao bán" : "cho thuê"} nhiều nhất ở ${where}?`,
    a: kindStats.map((s) => `${PROP[s.kind] || s.kind}: ${s.n} tin, trung vị ${fmtP(s.med, deal)}`).join("; ") + ".",
  });
  if (cheapest.length >= 2) faq.push({
    q: `Khu vực nào ở ${province} có giá ${deal === "ban" ? "bán" : "thuê"} mềm hơn?`,
    a: `Theo trung vị tin đang đăng: ${cheapest.map((s) => `${s.d} (${fmtP(s.med, deal)}, ${s.n} tin)`).join(", ")}. Cao nhất: ${priciest.map((s) => `${s.d} (${fmtP(s.med, deal)})`).join(", ")}.`,
  });
  faq.push({
    q: `Làm sao biết tin ${where} trên NhaDat Radar có thật?`,
    a: `Radar ghi rõ nguồn từng tin (${sources.slice(0, 5).join(", ")}), thời điểm Radar thấy tin lần đầu và lần gần nhất, cảnh báo tin có giá lệch ≥28% so với trung vị khu vực, và nêu dấu hiệu môi giới/chính chủ từ dữ liệu (${brokers} tin có dấu hiệu môi giới, ${owners} tin có dấu hiệu chính chủ trong ${rows.length} tin gần nhất). Luôn xem nhà trực tiếp và kiểm tra pháp lý trước khi đặt cọc.`,
  });

  // ---- JSON-LD ----
  const url = SITE + (boLocSlug ? `${baseUrl}/${boLocSlug}` : trang > 1 ? `${baseUrl}/trang/${trang}` : baseUrl);
  const ld = [
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Trang chủ", item: SITE },
      { "@type": "ListItem", position: 2, name: `${dealWord} nhà đất`, item: SITE + (deal === "ban" ? "/nha-dat-ban" : "/nha-dat-cho-thue") },
      { "@type": "ListItem", position: 3, name: province, item: SITE + areaPath(deal, province) },
      ...(district ? [{ "@type": "ListItem", position: 4, name: district, item: SITE + areaPath(deal, province, district) }] : []),
      ...(kindWord ? [{ "@type": "ListItem", position: district ? 5 : 4, name: kindWord, item: SITE + baseUrl }] : []),
      ...(boLocCfg && district ? [{ "@type": "ListItem", position: 6, name: boLocCfg.nhan, item: url }] : []),
    ] },
    { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })) },
    { "@context": "https://schema.org", "@type": "ItemList", name: h1, numberOfItems: show.length, itemListElement: show.map((x, i) => ({
      "@type": "ListItem", position: i + 1, url: `${SITE}/listings/${x.id}`, name: x.title })) },
  ];

  return (
    <div>
      {ld.map((o, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(o) }} />)}

      <nav className="text-xs text-[var(--ink-soft)] mb-3 flex flex-wrap gap-1">
        <Link href="/" className="hover:text-brand">Trang chủ</Link><span>/</span>
        <Link href={deal === "ban" ? "/nha-dat-ban" : "/nha-dat-cho-thue"} className="hover:text-brand">{dealWord} nhà đất</Link><span>/</span>
        {district ? (
          <>
            <Link href={areaPath(deal, province)} className="hover:text-brand">{province}</Link><span>/</span>
            {kindWord ? (
              <>
                <Link href={areaPath(deal, province, district)} className="hover:text-brand">{district}</Link><span>/</span>
                {boLocCfg || trang > 1 ? (
                  <>
                    <Link href={baseUrl} className="hover:text-brand">{kindWord}</Link><span>/</span>
                    <span className="text-[var(--ink)]">{boLocCfg ? boLocCfg.nhan : `Trang ${trang}`}</span>
                  </>
                ) : (
                  <span className="text-[var(--ink)]">{kindWord}</span>
                )}
              </>
            ) : <span className="text-[var(--ink)]">{district}</span>}
          </>
        ) : (kindWord ? <><Link href={areaPath(deal, province)} className="hover:text-brand">{province}</Link><span>/</span><span className="text-[var(--ink)]">{kindWord}</span></> : <span className="text-[var(--ink)]">{province}</span>)}
      </nav>

      <h1 className="prata text-2xl md:text-3xl">{h1}</h1>
      <p className="text-sm text-[var(--ink-soft)] mt-1">
        Hiện có <b>{total.toLocaleString("vi-VN")}</b> tin {deal === "ban" ? "bán" : "cho thuê"} tại {where}
        {newToday ? <> · <b className="text-emerald-600">{newToday} tin mới hôm nay</b></> : null}
        {" "}· tổng hợp từ {sources.length} nguồn, cập nhật hằng ngày.
      </p>
      {/* 3/10 SEO: liên kết nội bộ sang báo cáo giá thuê của quận (trang tin tức) - chỉ trang phòng trọ cấp quận TP.HCM */}
      {deal === "cho_thue" && district && kind === "phong_tro" && province === "Hồ Chí Minh" && total >= 30 && (
        <p className="text-sm mt-1">
          <Link href={`/tin-tuc/gia-thue-phong-tro-${slugify(district)}`} className="text-brand font-semibold hover:underline inline-flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 shrink-0" />
            <span>Giá thuê phòng trọ {tenKhuVucGon(district)} tháng này: trung vị, theo diện tích, phường rẻ nhất ›</span>
          </Link>
        </p>
      )}

      {/* Dải độc quyền chỉ hiện ở trang 1 gốc (tránh lặp qua các trang phân trang) */}
      {trang === 1 && !boLocSlug && <div className="mt-5"><DaiDocQuyen listings={hienRows} /></div>}

      {/* Bộ lọc tĩnh cho phòng trọ cấp quận (SEO Audit §4.5: chip theo giá/tiện ích dẫn sang URL tĩnh) */}
      {deal === "cho_thue" && district && kind === "phong_tro" && areaCount(area, deal, district, "phong_tro") >= NGUONG.boLoc && (
        <section className="mt-5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-semibold text-[var(--ink-soft)]">Lọc nhanh tại {tenKhuVucGon(district)}:</span>
            <Link
              href={baseUrl}
              className={`px-2.5 py-1.5 rounded-lg border transition ${!boLocSlug ? "border-brand bg-brand/5 text-brand font-semibold" : "border-[var(--line)] hover:border-brand hover:text-brand"}`}
            >
              Tất cả
            </Link>
            {(Object.entries(BO_LOC_SEO) as [BoLocSlug, { nhan: string }][]).map(([slug, cfg]) => (
              <Link
                key={slug}
                href={`${baseUrl}/${slug}`}
                className={`px-2.5 py-1.5 rounded-lg border transition ${boLocSlug === slug ? "border-brand bg-brand/5 text-brand font-semibold" : "border-[var(--line)] hover:border-brand hover:text-brand"}`}
              >
                {cfg.nhan}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Tóm tắt thị trường (số thật) */}
      {medPrice ? (
        <section className="card rounded-xl p-5 mt-5">
          <h2 className="font-bold mb-2">Thị trường {where} {monthLabel}</h2>
          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            <Link href={`${searchHref}&priceMin=${p25}&priceMax=${p75}`} rel="nofollow" className="border-l-2 border-brand/50 pl-3 hover:bg-[var(--surface-2)] rounded-r-md transition p-1 group">
              <div className="text-xs text-[var(--ink-soft)] uppercase flex items-center justify-between">
                <span>Giá phổ biến</span>
                <span className="text-[10px] text-brand font-semibold group-hover:underline">Xem tin ›</span>
              </div>
              <div className="font-bold text-brand">{fmtP(p25!, deal)} - {fmtP(p75!, deal)}</div>
            </Link>
            <div className="border-l-2 border-[var(--line)] pl-3 p-1">
              <div className="text-xs text-[var(--ink-soft)] uppercase">Trung vị</div>
              <div className="font-bold">{fmtP(medPrice, deal)}{medPpm2 ? <span className="text-[var(--ink-soft)] font-normal"> · {fmtPpm2(medPpm2)}</span> : null}</div>
            </div>
            <Link href={`${searchHref}&anh=co`} rel="nofollow" className="border-l-2 border-brand/50 pl-3 hover:bg-[var(--surface-2)] rounded-r-md transition p-1 group">
              <div className="text-xs text-[var(--ink-soft)] uppercase flex items-center justify-between">
                <span>Tin có ảnh</span>
                <span className="text-[10px] text-brand font-semibold group-hover:underline">Lọc ảnh ›</span>
              </div>
              <div className="font-bold">{withImg.toLocaleString("vi-VN")}/{total.toLocaleString("vi-VN")}</div>
            </Link>
          </div>
          {kindStats.length ? (
            <p className="text-sm text-[var(--ink-soft)] mt-3">
              Theo loại hình: {kindStats.map((s) => <span key={s.kind}><b>{PROP[s.kind] || s.kind}</b> {s.n} tin, trung vị {fmtP(s.med, deal)}; </span>)}
            </p>
          ) : null}
          {cheapest.length >= 2 ? (
            <p className="text-sm text-[var(--ink-soft)] mt-1">
              Giá mềm hơn: {cheapest.map((s) => <Link key={s.d} href={areaPath(deal, province, s.d)} className="text-brand font-semibold">{s.d} ({fmtP(s.med, deal)})</Link>).reduce<ReactNode[]>((acc, el, i) => (i ? [...acc, ", ", el] : [el]), [])}.
            </p>
          ) : null}
          <p className="text-[0.7rem] text-[var(--ink-faint)] mt-2">Tính từ {prices.length} tin đang hiển thị (đến 300 tin mới nhất). Tham khảo, không phải định giá chính thức.</p>
          <div className="mt-3"><PriceTrend province={province} district={district} kind="all" deal={deal} compact /></div>
        </section>
      ) : null}

      {/* Loại BĐS trong khu vực (trang SEO theo loại) */}
      {kindsHere.length ? (
        <section className="mt-6">
          <h2 className="font-bold text-sm mb-2">{dealWord} theo loại BĐS tại {where}</h2>
          <div className="flex flex-wrap gap-2">
            {kind ? (
              <Link href={areaPath(deal, province, district)} className="text-xs px-2.5 py-1.5 rounded-lg border border-[var(--line)] hover:border-brand hover:text-brand transition">Tất cả loại</Link>
            ) : null}
            {kindsHere.map(([k, c]) => (
              <Link key={k} href={areaPath(deal, province, district, k)}
                className={`text-xs px-2.5 py-1.5 rounded-lg border transition ${k === kind ? "border-brand text-brand font-semibold" : "border-[var(--line)] hover:border-brand hover:text-brand"}`}>
                {PROP[k] || k} <span className="text-[var(--ink-faint)]">({c[deal]})</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Quận lân cận (trang cấp quận) */}
      {quanKhac.length ? (
        <section className="mt-6">
          <h2 className="font-bold text-sm mb-2">{dealWord} {kindWord || "nhà đất"} ở khu vực lân cận</h2>
          <div className="flex flex-wrap gap-2">
            {quanKhac.map(([d, c]) => (
              <Link key={d} href={areaPath(deal, province, d, kind)} className="text-xs px-2.5 py-1.5 rounded-lg border border-[var(--line)] hover:border-brand hover:text-brand transition">
                {d} <span className="text-[var(--ink-faint)]">({c[deal]})</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Quận/huyện trong tỉnh */}
      {!district && districts.length ? (
        <section className="mt-6">
          <h2 className="font-bold text-sm mb-2">{dealWord} nhà đất theo quận/huyện tại {province}</h2>
          <div className="flex flex-wrap gap-2">
            {districts.map(([d, c]) => (
              <Link key={d} href={areaPath(deal, province, d)} className="text-xs px-2.5 py-1.5 rounded-lg border border-[var(--line)] hover:border-brand hover:text-brand transition">
                {d} <span className="text-[var(--ink-faint)]">({c[deal]})</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Danh sách tin */}
      <section className="mt-6">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <h2 className="font-bold">Tin {deal === "ban" ? "bán" : "cho thuê"} mới nhất tại {where}</h2>
          <Link href={searchHref} rel="nofollow" className="text-sm text-brand font-semibold">Xem tất cả {total.toLocaleString("vi-VN")} tin + bộ lọc ›</Link>
        </div>
        {show.length ? (
          <div className="flex flex-col gap-3">{show.map((x) => <ListingRow key={x.id} x={x} />)}</div>
        ) : (
          <p className="text-sm text-[var(--ink-soft)]">Chưa có tin nào - Radar cào lại mỗi sáng.</p>
        )}
        {coPhanTrangTinh && (total > TIN_MOI_TRANG || trang > 1) ? (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {trang > 1 && (
              <Link href={trang === 2 ? baseUrl : `${baseUrl}/trang/${trang - 1}`} className="btn min-h-11">
                ‹ Trang {trang - 1}
              </Link>
            )}
            <span className="text-xs text-[var(--ink-soft)] px-2">
              Trang {trang} / {Math.max(trang, Math.min(TRANG_TINH_TOI_DA, Math.ceil(total / TIN_MOI_TRANG)))}
            </span>
            {total > trang * TIN_MOI_TRANG && trang < TRANG_TINH_TOI_DA && (
              <Link href={`${baseUrl}/trang/${trang + 1}`} className="btn btn-primary min-h-11">
                Xem tiếp trang {trang + 1} ›
              </Link>
            )}
            <Link href={searchHref} rel="nofollow" className="btn min-h-11">
              Mở bộ lọc nâng cao ›
            </Link>
          </div>
        ) : total > show.length ? (
          <div className="mt-4 text-center"><Link href={searchHref} rel="nofollow" className="btn">Xem thêm {(total - show.length).toLocaleString("vi-VN")} tin</Link></div>
        ) : null}
      </section>

      {/* Khối kích hoạt Lead: Săn nhà / phòng hộ qua Zalo */}
      <SanPhongHoCTA
        tieuDe={`Cần tìm nhanh ${kindWord ? kindWord.toLowerCase() : "nhà đất"} ${dealWord.toLowerCase()} tại ${where}?`}
        moTa={`Nhắn tiêu chí (tài chính, khu vực, tiện ích mong muốn) cho Radar qua Zalo. Đội ngũ Radar sẽ lọc rổ hàng đã xác minh tại ${where} và gửi bạn 3 căn phù hợp nhất trong 15 phút.`}
        tinNhanZalo={`Chào Radar, mình đang cần tìm ${kindWord ? kindWord.toLowerCase() : "nhà đất"} ${dealWord.toLowerCase()} tại ${where}, tư vấn giúp mình nhé!`}
      />

      {/* FAQ */}
      <section className="mt-10 card rounded-xl p-5">
        <h2 className="font-bold mb-3">Câu hỏi thường gặp về {deal === "ban" ? "mua" : "thuê"} nhà đất {where}</h2>
        <div className="flex flex-col gap-3 text-sm">
          {faq.map((f) => (
            <details key={f.q} className="group">
              <summary className="font-semibold cursor-pointer">{f.q}</summary>
              <p className="text-[var(--ink-soft)] mt-1 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Liên kết chéo */}
      <section className="mt-6 text-sm flex flex-wrap gap-x-4 gap-y-1">
        <Link href={areaPath(otherDeal, province, district, kind)} className="text-brand">{DEAL_WORD[otherDeal]} {kindWord || "nhà đất"} {where} ›</Link>
        {district ? <Link href={areaPath(deal, province, null, kind)} className="text-brand">Toàn {province} ›</Link> : null}
        {kind ? <Link href={areaPath(deal, province, district)} className="text-brand">Tất cả loại BĐS tại {where} ›</Link> : null}
        {/* mang theo ngữ cảnh bán/thuê + tỉnh - link trần từng nhảy về mặc định sai chiều */}
        <Link href={`/thong-ke?deal=${deal}&city=${encodeURIComponent(province)}`} className="text-brand">Thống kê giá ›</Link>
        <Link href="/dinh-gia" className="text-brand">Định giá nhanh ›</Link>
      </section>
    </div>
  );
}

const layTinHub = unstable_cache(
  async (deal: Deal) => {
    const supabase = createAdminClient();
    const taoQ = () => supabase.from("listings").select(COLS).eq("status", "published").eq("deal", deal);
    const moi = { ascending: false } as const;
    const [rhRes, tinRes, newRes] = await Promise.all([
      truyVanVoiRetry(() => taoQ().eq("source", "ro_hang").order("first_seen_at", moi).limit(20), `hub:${deal}:rh`),
      truyVanVoiRetry(() => taoQ().neq("source", "ro_hang").order("first_seen_at", moi).limit(30), `hub:${deal}:tin`),
      truyVanVoiRetry(
        () =>
          supabase.from("listings").select("id", { count: "exact", head: true })
            .eq("status", "published").eq("deal", deal).gte("first_seen_at", startOfDayVN()),
        `hub:${deal}:new`,
      ),
    ]);
    return {
      hien: tronRoHang((rhRes.data ?? []) as { id: string }[], (tinRes.data ?? []) as { id: string }[]).slice(0, 30),
      newToday: newRes.count ?? 0,
    };
  },
  ["hub-listings-v1"],
  { revalidate: 21600, tags: ["listings", "ds-tin"] },
);

export async function hubMeta(deal: Deal) {
  const path = deal === "ban" ? "/nha-dat-ban" : "/nha-dat-cho-thue";
  const dealWord = DEAL_WORD[deal];
  try {
    const { counts } = await getAreas();
    const total = Object.values(counts).reduce((s, c) => s + (c[deal] || 0), 0);
    const so = total.toLocaleString("vi-VN");
    return {
      title: `${dealWord} nhà đất toàn quốc - ${so} tin cập nhật ${ngayVN()} | NhaDat Radar`,
      description: `${so} tin ${deal === "ban" ? "bán" : "cho thuê"} nhà đất, phòng trọ, căn hộ trên toàn quốc. Tổng hợp theo tỉnh, quận/huyện, loại bất động sản, giá thật và hỗ trợ xem nhà miễn phí.`,
      alternates: { canonical: path },
    };
  } catch {
    return {
      title: `${dealWord} nhà đất toàn quốc | NhaDat Radar`,
      alternates: { canonical: path },
    };
  }
}

/** Hub tĩnh cho /nha-dat-ban và /nha-dat-cho-thue (thay cho SearchPage force-dynamic, giữ ISR & truyền PageRank xuống trang khu vực) */
export async function HubGiaoDich({ deal }: { deal: Deal }) {
  const [{ counts }, { hien, newToday }] = await Promise.all([getAreas(), layTinHub(deal)]);
  const hienRows = ((hien ?? []) as Listing[]).map(cheSoTin);
  const total = Object.values(counts).reduce((s, c) => s + (c[deal] || 0), 0);
  const provinces = Object.entries(counts)
    .filter(([, c]) => (c[deal] || 0) >= NGUONG.tinh)
    .sort((a, b) => (b[1][deal] || 0) - (a[1][deal] || 0));

  const hcm = counts["Hồ Chí Minh"];
  const topQuanHcm = hcm
    ? Object.entries(hcm.districts)
        .filter(([, dc]) => (dc[deal] || 0) >= NGUONG.quan)
        .sort((a, b) => (b[1][deal] || 0) - (a[1][deal] || 0))
        .slice(0, 16)
    : [];

  // Loại BĐS phổ biến trỏ tới tỉnh có nhiều tin nhất của loại đó (giữ trang đích luôn có dữ liệu thật)
  const topKinds = Object.keys(KIND_SLUG)
    .map((k) => {
      let sum = 0;
      let bestProv = "";
      let bestCount = 0;
      for (const [p, c] of Object.entries(counts)) {
        const kn = c.kinds?.[k]?.[deal] || 0;
        sum += kn;
        if (kn > bestCount) { bestCount = kn; bestProv = p; }
      }
      return { kind: k, sum, href: bestProv && bestCount >= NGUONG.loai ? areaPath(deal, bestProv, null, k) : null };
    })
    .filter((x): x is { kind: string; sum: number; href: string } => !!x.href && x.sum >= NGUONG.loai)
    .sort((a, b) => b.sum - a.sum);

  const idsDocQuyen = new Set(locDocQuyen(hienRows, 6).map((t) => t.id));
  const show = hienRows.filter((r) => !idsDocQuyen.has(r.id)).slice(0, 24);
  const path = deal === "ban" ? "/nha-dat-ban" : "/nha-dat-cho-thue";
  const dealWord = DEAL_WORD[deal];
  const h1 = `${dealWord} nhà đất toàn quốc - ${total.toLocaleString("vi-VN")} tin`;

  const ld = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Trang chủ", item: SITE },
        { "@type": "ListItem", position: 2, name: `${dealWord} nhà đất`, item: SITE + path },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: h1,
      numberOfItems: show.length,
      itemListElement: show.map((x, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/listings/${x.id}`, name: x.title })),
    },
  ];

  return (
    <div>
      {ld.map((o, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(o) }} />)}

      <nav className="text-xs text-[var(--ink-soft)] mb-3 flex flex-wrap gap-1">
        <Link href="/" className="hover:text-brand">Trang chủ</Link><span>/</span>
        <span className="text-[var(--ink)]">{dealWord} nhà đất</span>
      </nav>

      <h1 className="prata text-2xl md:text-3xl">{h1}</h1>
      <p className="text-sm text-[var(--ink-soft)] mt-1">
        Hiện có <b>{total.toLocaleString("vi-VN")}</b> tin {deal === "ban" ? "rao bán" : "cho thuê"} trên {provinces.length} tỉnh/thành
        {newToday ? <> · <b className="text-emerald-600">{newToday} tin mới hôm nay</b></> : null}
        {" "}· tổng hợp đa nguồn, cập nhật hằng ngày.
      </p>

      <div className="mt-5"><DaiDocQuyen listings={hienRows} /></div>

      {/* Tỉnh / Thành phố */}
      {provinces.length ? (
        <section className="mt-6">
          <h2 className="font-bold text-sm mb-2">{dealWord} theo Tỉnh / Thành phố</h2>
          <div className="flex flex-wrap gap-2">
            {provinces.map(([p, c]) => (
              <Link key={p} href={areaPath(deal, p)} className="text-xs px-2.5 py-1.5 rounded-lg border border-[var(--line)] hover:border-brand hover:text-brand transition">
                {p} <span className="text-[var(--ink-faint)]">({c[deal].toLocaleString("vi-VN")})</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Top quận TP.HCM */}
      {topQuanHcm.length ? (
        <section className="mt-5">
          <h2 className="font-bold text-sm mb-2">Quận/Huyện nhiều tin tại TP.HCM</h2>
          <div className="flex flex-wrap gap-2">
            {topQuanHcm.map(([d, dc]) => (
              <Link key={d} href={areaPath(deal, "Hồ Chí Minh", d)} className="text-xs px-2.5 py-1.5 rounded-lg border border-[var(--line)] hover:border-brand hover:text-brand transition">
                {d} <span className="text-[var(--ink-faint)]">({dc[deal].toLocaleString("vi-VN")})</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Loại BĐS */}
      {topKinds.length ? (
        <section className="mt-5">
          <h2 className="font-bold text-sm mb-2">Theo loại hình bất động sản</h2>
          <div className="flex flex-wrap gap-2">
            {topKinds.map((x) => (
              <Link key={x.kind} href={x.href} className="text-xs px-2.5 py-1.5 rounded-lg border border-[var(--line)] hover:border-brand hover:text-brand transition">
                {PROP[x.kind] || x.kind} <span className="text-[var(--ink-faint)]">({x.sum.toLocaleString("vi-VN")})</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Chuyên đề & Điểm neo (nhánh cho thuê) */}
      {deal === "cho_thue" && (
        <section className="mt-5">
          <h2 className="font-bold text-sm mb-2">Tìm nhanh theo nhu cầu &amp; điểm neo TP.HCM</h2>
          <div className="flex flex-wrap gap-2">
            {Object.values(DANH_SACH_CHUYEN_DE).map((cd) => (
              <Link key={cd.slug} href={`/${cd.slug}`} className="text-xs px-2.5 py-1.5 rounded-lg border border-brand/40 text-brand font-medium hover:bg-brand/5 transition">
                {cd.title}
              </Link>
            ))}
            <Link href="/phong-tro-gan-truong-dai-hoc" className="text-xs px-2.5 py-1.5 rounded-lg border border-[var(--line)] hover:border-brand hover:text-brand transition">
              Gần trường Đại học
            </Link>
            {DIEM_NEO.slice(0, 8).map((dn) => (
              <Link key={dn.slug} href={`/phong-tro-gan/${dn.slug}`} className="text-xs px-2.5 py-1.5 rounded-lg border border-[var(--line)] hover:border-brand hover:text-brand transition">
                Gần {dn.ten}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Danh sách tin mới nhất */}
      <section className="mt-6">
        <div className="flex items-baseline justify-between gap-3 mb-3">
          <h2 className="font-bold">Tin {deal === "ban" ? "bán" : "cho thuê"} mới nhất</h2>
          <Link href={`/search?deal=${deal}`} rel="nofollow" className="text-sm text-brand font-semibold">
            Mở bộ lọc &amp; bản đồ tìm nâng cao ›
          </Link>
        </div>
        {show.length ? (
          <div className="flex flex-col gap-3">{show.map((x) => <ListingRow key={x.id} x={x} />)}</div>
        ) : (
          <p className="text-sm text-[var(--ink-soft)]">Chưa có tin nào.</p>
        )}
        <div className="mt-5 text-center">
          <Link href={`/search?deal=${deal}`} rel="nofollow" className="btn">
            Lọc chi tiết {total.toLocaleString("vi-VN")} tin theo giá, diện tích, bản đồ ›
          </Link>
        </div>
      </section>

      <SanPhongHoCTA
        tieuDe={`Cần tìm nhanh nhà đất ${deal === "ban" ? "bán" : "cho thuê"} đúng tầm giá?`}
        moTa="Nhắn khu vực, ngân sách và nhu cầu qua Zalo. Radar lọc sẵn các căn phù hợp từ rổ hàng đang trống và hỗ trợ dẫn xem miễn phí."
        tinNhanZalo={`Chào Radar, mình cần tìm ${deal === "ban" ? "nhà đất mua" : "phòng trọ / căn hộ thuê"}, nhờ tư vấn giúp mình nhé!`}
      />
    </div>
  );
}
