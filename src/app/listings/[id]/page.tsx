// Cache ISR 24 giờ trên CDN Vercel - bot cào không tốn egress Supabase.
export const revalidate = 86400;

// Audit 25/10 (đo bằng `next start`): thiếu hàm này thì route [id] là ƒ Dynamic - header trả
// "private, no-cache, no-store", `revalidate` ở trên KHÔNG có tác dụng, CDN không giữ trang nào.
// Trả [] = không dựng sẵn lúc build (~22.000 tin), dựng lần đầu khi có người mở rồi cache ISR như trang tĩnh.
export async function generateStaticParams() {
  return [];
}

import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { getAreasDaily } from "@/lib/geo";
import { createClient } from "@/lib/supabase/server";
import { createAnonClient } from "@/lib/supabase/anon";
import { createAdminClient } from "@/lib/supabase/admin";
import { unstable_cache } from "next/cache";
import { LISTING_PUBLIC_COLS, LISTING_THE_COLS } from "@/lib/cols";
import { fmtPrice, fmtPpm2, fresh, PROP, AMEN, thumb, catChu, canonDistrict } from "@/lib/format";
import { cleanImages, layVideo } from "@/lib/img";
import { median, percentile } from "@/lib/gemini";
import { posterReasonText, type Listing } from "@/lib/types";
import AdminDetailBar from "@/components/AdminDetailBar";
import ContactForm from "./ContactForm";
import ReportButton from "./ReportButton";
import PriceTrend from "@/components/PriceTrend";
import { areaPath, DEAL_WORD } from "@/lib/slug";
import { ldJson, SITE_URL } from "@/lib/ld";
import { nhanTinh } from "@/lib/sap-nhap";
import ScoreInfo from "@/components/ScoreInfo";
import LegalHint from "@/components/LegalHint";
import MortgageMini from "@/components/MortgageMini";
import RecentlyViewed, { RecentlyViewedTracker } from "@/components/RecentlyViewed";
import dynamic from "next/dynamic";

const ListingMap = dynamic(() => import("@/components/ListingMap"), {
  loading: () => (
    <div className="w-full h-72 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse flex items-center justify-center text-slate-400 text-sm">
      Đang tải vị trí bất động sản...
    </div>
  ),
});
import ListingCard from "@/components/ListingCard";
import Gallery from "@/components/Gallery";
import PhoneReveal from "@/components/PhoneReveal";
import SourceBadge from "@/components/SourceBadge";
import TuVanRadar from "@/components/TuVanRadar";
import RichText from "@/components/RichText";
import { laTinDocQuyen, cheSoVanBan, cheSoNha, cheSoTin } from "@/lib/doc-quyen";
import { laRoHang, tenNguon, tenTrang, tagGiuPhong, maPhong } from "@/lib/ro-hang";
import { nhanTienIch } from "@/lib/tien-ich";
import { HOTLINE, HOTLINE_ZALO } from "@/components/TuVanRadar";
import FavButton from "@/components/FavButton";
import ChiaSe from "@/components/ChiaSe";
import { GhiXemTin, NutZalo, NutChepMa } from "@/components/TheoDoi";
import MoTaThuGon from "@/components/MoTaThuGon";
import HangVuot from "@/components/HangVuot";
import AppointmentForm from "@/components/AppointmentForm";
import NutQuayLai from "@/components/NutQuayLai";
import MobileSectionJumper from "@/components/MobileSectionJumper";
import SimilarListings from "@/components/SimilarListings";
import AdSenseBanner from "@/components/AdSenseBanner";
import { layTinTuongTu, type ListingTuongTu } from "@/lib/tuong-tu";
import { MapPin, ShieldCheck, Building2, AlertTriangle, HelpCircle, MessageSquare, MessageCircle, ChevronLeft } from "lucide-react";

// ---- DỮ LIỆU CÔNG KHAI CỦA TRANG TIN, CÓ CACHE (28/9) ----------------------------------------------
// Trang tin là trang bị bot gọi nhiều nhất (~10.000 URL trong sitemap). Trước đây MỖI lượt xem gọi
// Supabase ~8 lần (tin, dự án, đếm tin dự án, hỏi đáp, có-SĐT, so giá, tin liên quan, tin cùng người
// đăng) -> đo 28/9: ~80.000 request/ngày, vượt hạn mức egress (8/5 GB) + log (9,8/1 GB) gói Free.
// Phần này giống nhau với MỌI khách nên cache 30 phút theo id (client anon, không cookie). Dữ liệu chỉ
// đổi mỗi lượt crawl (4 tiếng). Chỉ phần theo người xem (admin, SĐT sau đăng nhập) còn gọi thẳng DB.
type Sb = ReturnType<typeof createAnonClient> | Awaited<ReturnType<typeof createClient>>;

// 3/10 (egress, bot quét ~500 trang tin/giờ): so giá / tin liên quan / tin cùng người đăng GIỐNG NHAU với
// mọi tin cùng nhóm -> cache theo NHÓM (quận+loại, người đăng) thay vì theo từng tin. Tin cùng quận dùng
// chung 1 lần đọc. Lấy dư 1 dòng rồi bỏ chính tin đang xem ở server.
const soGiaNhom = unstable_cache(
  async (deal: string, kind: string, district: string) => {
    const { data } = await createAnonClient().from("listings").select("price_per_m2")
      .eq("status", "published").eq("deal", deal).eq("kind", kind).eq("district", district)
      .not("price_per_m2", "is", null).gt("price_per_m2", 0).limit(300);
    return (data ?? []) as { price_per_m2: number }[];
  },
  ["so-gia-nhom-v1"], { revalidate: 86400, tags: ["listings"] },
);
const lienQuanNhom = unstable_cache(
  async (kind: string, cot: "district" | "province", khuVuc: string, roHang: boolean) => {
    const { data } = await createAnonClient().from("listings").select(LISTING_THE_COLS)
      .eq("status", "published").eq("kind", kind).eq(cot, khuVuc)
      // 2/10: tin rổ hàng -> "liên quan" là phòng rổ hàng khác (hàng mình), không dẫn khách sang tin Chợ Tốt
      .eq(roHang ? "source" : "status", roHang ? "ro_hang" : "published")
      .not("images", "eq", "{}")
      .order("ai_score", { ascending: false, nullsFirst: false }).limit(7);
    return (data ?? []) as unknown as Listing[];
  },
  ["lien-quan-nhom-v2"], { revalidate: 86400, tags: ["listings"] },
);
const cungNguoiDang = unstable_cache(
  async (posterKey: string) => {
    const { data, count } = await createAnonClient().from("listings").select(LISTING_THE_COLS, { count: "exact" })
      .eq("status", "published").eq("poster_key", posterKey)
      .order("first_seen_at", { ascending: false }).limit(7);
    return { rows: (data ?? []) as unknown as Listing[], count: count ?? 0 };
  },
  ["cung-nguoi-dang-v2"], { revalidate: 86400, tags: ["listings"] },
);
const cungToaNha = unstable_cache(
  async (district: string, address: string, lat: number | null, lng: number | null) => {
    const sb = createAnonClient();
    // Ưu tiên khớp theo toạ độ công khai của toà nhà (mọi phòng cùng toà dùng chung 1 điểm lechToaDo) hoặc cùng address
    let q = sb
      .from("listings")
      .select("id,title,price_vnd,area_m2,deal,kind,floors,specs")
      .eq("status", "published")
      .eq("source", "ro_hang")
      .eq("deal", "cho_thue")
      .eq("district", district);
    if (lat != null && lng != null) {
      q = q.eq("lat", lat).eq("lng", lng);
    } else {
      q = q.eq("address", address);
    }
    const { data } = await q.order("price_vnd", { ascending: true }).limit(16);
    return (data ?? []) as {
      id: string;
      title: string;
      price_vnd: number | null;
      area_m2: number | null;
      deal: string;
      kind: string;
      floors?: number | null;
      specs?: Record<string, string> | null;
    }[];
  },
  ["cung-toa-nha-v1"], { revalidate: 86400, tags: ["listings"] },
);

async function phuTroTin(sb: Sb, x: Listing & { has_contact_phone?: boolean }) {
  const [du, dem, hd, comp, rel, poster, tuongTu, cungToa] = await Promise.all([
    x.project_id ? sb.from("projects").select("id,name,investor").eq("id", x.project_id).maybeSingle() : Promise.resolve({ data: null }),
    x.project_id ? sb.from("listings").select("id", { count: "exact", head: true }).eq("project_id", x.project_id).eq("status", "published") : Promise.resolve({ count: 0 }),
    // Hỏi đáp tích luỹ từ Cầu Nối (listing_facts đọc công khai qua RLS facts_read)
    sb.from("listing_facts").select("id,question,answer").eq("listing_id", x.id).order("created_at", { ascending: false }).limit(8),
    // So sánh giá cùng loại + cùng quận
    x.district ? soGiaNhom(x.deal, x.kind, x.district).catch(() => []) : Promise.resolve([]),
    // audit 16/8: thiếu cả quận lẫn tỉnh thì ilike "%%" trả tin toàn quốc -> chỉ hỏi khi có khu vực; ảnh không rỗng lọc ở DB
    (x.district || x.province)
      ? lienQuanNhom(x.kind, x.district ? "district" : "province", (x.district || x.province)!, x.source === "ro_hang").catch(() => [])
      : Promise.resolve([] as Listing[]),
    x.poster_key ? cungNguoiDang(x.poster_key).catch(() => ({ rows: [] as Listing[], count: 0 })) : Promise.resolve({ rows: [] as Listing[], count: 0 }),
    layTinTuongTu(x, 6).catch(() => [] as ListingTuongTu[]),
    x.source === "ro_hang" && x.deal === "cho_thue" && x.district && x.address
      ? cungToaNha(x.district, x.address, x.lat ?? null, x.lng ?? null).catch(() => [])
      : Promise.resolve([]),
  ]);
  const posterRows = poster.rows.filter((r) => r.id !== x.id).slice(0, 6);
  return {
    tin: x,
    duAn: (du.data ?? null) as { id: string; name: string; investor: string | null } | null,
    tinCungDuAn: ("count" in dem ? dem.count : 0) ?? 0,
    hoiDap: (hd.data ?? []) as { id: string; question: string; answer: string | null }[],
    // has_contact_phone (cột sinh, migration 026) đọc chung trong select chính, không tốn request riêng
    coSdt: !!x.has_contact_phone,
    compRows: comp,
    relRows: rel.filter((r) => r.id !== x.id),
    tinTuongTu: tuongTu || [],
    phongCungToa: (cungToa || []).filter((r) => r.id !== x.id),
    posterRows,
    posterCount: Math.max(0, poster.count - (x.status === "published" ? 1 : 0)),   // count gồm cả chính tin này
  };
}
type TinCongKhai = Awaited<ReturnType<typeof phuTroTin>>;

// 3/11: thêm tag riêng từng tin "tin:<id>" - lượt nhập rổ hàng (crawler/xa-cache.mjs) xả đúng phòng vừa cho thuê /
// đổi giá, thay vì đợi 12 giờ hoặc xả cả tag "listings" (~22.000 trang, bot quét lại tốn egress)
const layTinCongKhai = (id: string) => unstable_cache(
  async (): Promise<TinCongKhai | null> => {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    const sb = createAnonClient();
    const { data, error } = await sb.from("listings").select(`${LISTING_PUBLIC_COLS},has_contact_phone`).eq("id", id).maybeSingle();
    // 42703 (cột trong LISTING_PUBLIC_COLS chưa có migration - đã xảy ra, xem 015) mà nuốt im lặng thì
    // MỌI tin ra 404, SEO de-index. NÉM lỗi: unstable_cache không cache lỗi, trang log lại.
    if (error) throw new Error(`listing detail ${id}: ${error.code} ${error.message}`);
    if (!data) return null;
    return phuTroTin(sb, data as unknown as Listing);
  },
  ["listing-detail-v5", id],
  { revalidate: 86400, tags: ["listings", `tin:${id}`] },   // 24 giờ (khớp ISR route; tin rổ hàng đổi giá/trạng thái được xaCacheTin xả qua tin:<id>)
)();

// 26/10: tin đã XOÁ hẳn (daily.mjs) trước đây ra 404 - Search Console báo 4.247 URL. Migration 036 ghi "bia mộ"
// (id + khu vực) lúc xoá -> 301 về trang khu vực như tin gone. Bảng lỗi (chưa chạy 036) thì NÉM để unstable_cache
// không giữ kết quả rỗng 1 ngày; trang bắt lỗi và trả 404 như cũ.
type BiaMo = Pick<Listing, "deal" | "kind" | "province" | "district">;
const layBiaMo = (id: string) => unstable_cache(
  async (): Promise<BiaMo | null> => {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    const { data, error } = await createAnonClient().from("listing_tombstones")
      .select("deal,kind,province,district").eq("id", id).maybeSingle();
    if (data) return data as BiaMo;
    // Tin vừa chuyển status = 'gone' bị RLS anon ẩn trên listings -> chỉ lấy đúng 4 cột khu vực để 308 về trang khu vực thay vì 404
    const { data: goneRow } = await createAdminClient().from("listings")
      .select("deal,kind,province,district").eq("id", id).eq("status", "gone").maybeSingle();
    if (goneRow) return goneRow as BiaMo;
    if (error) throw new Error(`tombstone ${id}: ${error.code} ${error.message}`);
    return null;
  },
  ["listing-tombstone-v2", id],
  { revalidate: 86400, tags: ["listings", `tin:${id}`] },
)();

/** Trang khu vực sâu nhất CÒN TIN cho tin đã gỡ: tỉnh/quận/loại -> tỉnh/quận -> tỉnh -> trang mua/thuê */
async function khuVucCuaTin(x: BiaMo): Promise<string> {
  const deal = x.deal === "cho_thue" ? "cho_thue" : "ban";
  const goc = deal === "ban" ? "/nha-dat-ban" : "/nha-dat-cho-thue";
  if (!x.province) return goc;
  const { counts } = await getAreasDaily();
  const tinh = counts[x.province];
  if (!tinh || !tinh[deal]) return goc;
  const d = x.district ? canonDistrict(x.district) : "";
  const quan = d ? tinh.districts[d] : undefined;
  if (quan && quan[deal] > 0) {
    if (x.kind && (quan.kinds?.[x.kind]?.[deal] ?? 0) > 0) return areaPath(deal, x.province, d, x.kind);
    return areaPath(deal, x.province, d);
  }
  return areaPath(deal, x.province);
}

/** Link khu vực cuối trang tin - chỉ trỏ tới trang CÒN TIN. Audit 29/10: link loại BĐS khu vực chưa có tin
 *  (vd phòng trọ Hóc Môn) ra 404 (AreaLanding notFound) -> Google gặp link hỏng từ trang tin. */
async function linkKhuVuc(x: { deal: string; province?: string | null; district?: string | null; kind?: string | null }) {
  const links: { href: string; nhan: string }[] = [];
  if (!x.province) return links;
  const deal = x.deal === "cho_thue" ? "cho_thue" : "ban";
  const { counts } = await getAreasDaily();
  const tinh = counts[x.province];
  if (!tinh) return links;
  const d = x.district ? canonDistrict(x.district) : "";
  const quan = d ? tinh.districts[d] : undefined;
  const noi = quan ? d : null;   // quận không có trong cây khu vực -> link cấp tỉnh
  const node = quan ?? tinh;
  const them = (dl: "ban" | "cho_thue", k: string | null | undefined, nhan: string) => {
    const n = k ? (node.kinds?.[k]?.[dl] ?? 0) : node[dl];
    const href = areaPath(dl, x.province!, noi, k);
    if (n > 0 && !links.some((l) => l.href === href)) links.push({ href, nhan: `${nhan} ${noi || x.province}` });
  };
  them(deal, x.kind, (x.kind && PROP[x.kind]) || "Bất động sản");
  if (deal === "cho_thue") { them("cho_thue", "phong_tro", "Phòng trọ"); them("cho_thue", "can_ho", "Căn hộ dịch vụ"); }
  else { them("ban", "nha", "Nhà riêng"); them("ban", "can_ho", "Căn hộ bán"); }
  them(deal === "ban" ? "cho_thue" : "ban", null, deal === "ban" ? "Cho thuê nhà đất" : "Nhà đất bán");
  return links;
}

function agoMin(iso: string | null): number | null {
  if (!iso) return null;
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

// SEO/OG: share link ra Facebook/Zalo có tiêu đề + ảnh + giá
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // cùng bản cache với thân trang (layTinCongKhai) - trước đây metadata là thêm 1 truy vấn mỗi lượt xem
  const pub = await layTinCongKhai(id).catch(() => null);
  const data = pub?.tin;
  if (!data) return { title: "Không tìm thấy tin - NhaDat Radar" };
  // Tin độc quyền: thân trang đã che SĐT trong mô tả (cheSoVanBan) nhưng thẻ meta/OG trước đây lấy mô tả
  // THÔ -> số lộ qua <meta name=description>, og:description, ảnh xem trước khi share (audit 22/9).
  const docQuyen = laTinDocQuyen(data);
  const roHang = laRoHang(data);
  const baseTitle = cheSoVanBan(data.title, docQuyen);
  const gia = fmtPrice(data.price_vnd, data.deal);
  const mp = maPhong(data.id);

  // 4/11 Audit (§3.3): Phòng rổ hàng 64% bị văn mẫu trùng tiêu đề ("Cho thuê Studio...").
  // Tự động bổ sung diện tích + phường để tạo Title & Snippet DUY NHẤT 100%, chống phạt duplicate content.
  let tieuDeGoc = baseTitle;
  if (roHang) {
    const phanPhu: string[] = [];
    if (data.area_m2 && !/\d+\s*m²/i.test(tieuDeGoc)) phanPhu.push(`${data.area_m2}m²`);
    if (data.ward && !tieuDeGoc.toLowerCase().includes(data.ward.toLowerCase())) {
      phanPhu.push(data.ward.replace(/^(phường|xã)\s+/i, "P."));
    }
    if (phanPhu.length > 0) {
      tieuDeGoc = `${tieuDeGoc.replace(/(\s*tại\s*khu\s*vực\s*|\s*khu\s*vực\s*).*$/i, "")} ${phanPhu.join(" ")}`.trim();
    }
  }

  // 29/10 (Screaming Frog) & 4/11 Audit: title trung vị 98 ký tự, Google cắt giữa chừng và mất luôn giá + tên site ở đuôi.
  // Bỏ `▶ [Có Video]` khỏi thẻ title để nhường 13 ký tự quý cho từ khóa tìm kiếm và tránh bị Google cắt cụm từ.
  // Giữ đuôi " - <giá> | NhaDat Radar" nguyên vẹn, cắt phần tên tin (ở ranh giới từ) cho tổng <= 60 ký tự.
  const duoi = ` - ${gia} | NhaDat Radar`;
  const choTen = Math.max(20, 60 - duoi.length);
  const tenGon = Array.from(tieuDeGoc).length <= choTen ? tieuDeGoc : `${catChu(tieuDeGoc, choTen - 1).replace(/\s+\S*$/, "").trim()}…`;
  const title = `${tenGon}${duoi}`;

  const moTa = cheSoVanBan(data.description, docQuyen);
  const quanChuan = data.district ? canonDistrict(data.district) : data.district;
  const diaDiem = [docQuyen ? cheSoNha(data.address) : data.address, data.ward, quanChuan, data.province].filter(Boolean).join(", ");
  const description = catChu(
    `${tieuDeGoc}. Giá niêm yết: ${gia}${data.area_m2 ? ` (${data.area_m2}m²)` : ""}. Vị trí: ${diaDiem}. 5 khoản phí minh bạch, ảnh thật, hẹn xem phòng miễn phí. Mã phòng: ${mp}.`,
    160
  );
  const img = cleanImages(data.images || [])[0];
  // 7/11 (SEO audit §3.3): Nếu tòa nhà có > 1 phòng đang trống, chỉ cho phép Google index phòng đại diện
  // (phòng giá tốt nhất / tạo sớm nhất trong cùng tòa) để tránh bị đánh lỗi Duplicate / Crawled - currently not indexed.
  const tatCaCungToa = [data, ...(pub?.phongCungToa ?? [])];
  const phongDaiDien = [...tatCaCungToa].sort(
    (a, b) => (a.price_vnd || 9e15) - (b.price_vnd || 9e15) || String(a.id).localeCompare(String(b.id))
  )[0];
  const choIndex = !roHang || !phongDaiDien || phongDaiDien.id === data.id;
  return {
    title,
    description,
    // canonical: trang tin trước đây không khai báo -> mọi biến thể URL (tham số utm, tracking) đều
    // được coi là trang riêng.
    alternates: { canonical: `/listings/${id}` },
    ...(choIndex ? {} : { robots: { index: false, follow: true } }),
    openGraph: { type: "article", url: `${SITE_URL}/listings/${id}`, title, description, ...(img ? { images: [{ url: img }] } : {}) },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(img ? { images: [img] } : {}),
    },
  };
}

export default async function ListingDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let pub: TinCongKhai | null = null;
  try { pub = await layTinCongKhai(id); } catch (e) { console.error(String(e)); }
  if (!pub) {
    const biaMo = await layBiaMo(id).catch(() => null);
    if (biaMo) permanentRedirect(await khuVucCuaTin(biaMo));
    notFound();
  }
  const data = pub.tin;
  if (data.status === "gone") permanentRedirect(await khuVucCuaTin(data));
  const x = { ...data, contact_phone: null } as Listing;
  if (x.district) x.district = canonDistrict(x.district);
  const docQuyen = laTinDocQuyen(x);
  Object.assign(x, cheSoTin(x));
  const t = thumb(x.kind);
  const images = cleanImages(x.images || []);

  const { duAn, tinCungDuAn, hoiDap, compRows, relRows, posterRows, posterCount, tinTuongTu, phongCungToa } = pub;
  const coSdt = pub.coSdt;

  const posterOthers = ((posterRows ?? []) as Listing[]).map(cheSoTin);

  const ppm2s = (compRows ?? []).map((r) => Number(r.price_per_m2)).filter((v) => v > 0);
  // UX audit 16/8: từng hiện "Cao hơn mặt bằng ~35%" dựa trên 1 tin -> vô nghĩa & gây hiểu lầm.
  // Chỉ so sánh khi có >=5 tin cùng loại trong quận; ít hơn thì nói thẳng "chưa đủ dữ liệu".
  const MIN_COMPS = 5;
  const enoughComps = ppm2s.length >= MIN_COMPS;
  const med = enoughComps ? median(ppm2s) : null, p25 = enoughComps ? percentile(ppm2s, 25) : null, p75 = enoughComps ? percentile(ppm2s, 75) : null;
  const myPpm2 = x.price_per_m2 ? Number(x.price_per_m2) : null;
  const diffPct = med && myPpm2 ? Math.round(((myPpm2 - med) / med) * 100) : null;

  const related = ((relRows ?? []) as Listing[]).map(cheSoTin).filter((r) => r.images?.length).slice(0, 6);
  const nextListingItem = related[0]
    ? {
        id: related[0].id,
        title: related[0].title,
        price: fmtPrice(related[0].price_vnd, related[0].deal),
        image: related[0].images?.[0] || null,
        location: related[0].district,
      }
    : null;

  const roleGuess = x.poster_role_guess;
  const seen = agoMin(x.first_seen_at);
  const lastSeen = agoMin(x.last_seen_at ?? null);
  const isGone = x.status === "gone";
  const isCrawl = x.source === "crawl";
  // RỔ HÀNG RADAR (28/9): hàng mình nắm - không link gốc, không tên đối tác, CTA chỉ về Radar (lib/ro-hang)
  const roHang = laRoHang(x);
  const laCuaMinh = roHang || docQuyen;
  const coSoDeMo = laCuaMinh || coSdt || !!x.phone_masked;
  const lienHeRadar = docQuyen; // rổ hàng + tin nhóm Zalo/FB: khách hỏi phí qua Radar; tin web thì hỏi người đăng
  // tin nhắn Zalo chép sẵn (2/10) - khách khỏi gõ, Radar biết ngay khách hỏi phòng/tin nào.
  // Audit 25/10: tin web cũng gắn mã (maPhong tra được cho MỌI tin qua /rh/[mã]) - trước đây chỉ có tiêu đề
  const ma = maPhong(x.id);
  const tinNhanZalo = roHang
    ? `Chào Radar, em muốn xem ${x.deal === "ban" ? "căn" : "phòng"} ${ma} - ${x.title} (${fmtPrice(x.price_vnd, x.deal)}). Em xem được lúc:`
    : `Chào Radar, em quan tâm tin Mã: ${ma} - ${x.title} (${fmtPrice(x.price_vnd, x.deal)}). Nhờ Radar tư vấn giúp em.`;
  const linkKV = await linkKhuVuc(x);
  const giuPhong = tagGiuPhong(x);
  const reasons = (x.poster_reasons || []).map(posterReasonText);
  const fmtDT = (iso: string | null | undefined) =>
    iso ? new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" }) : "-";

  // Chỉ hiện ô CÓ dữ liệu. Trước đây danh sách cứng 6 ô nên tin đất nền hiện "Nội thất -",
  // "Số tầng -", "Chỗ đậu xe -" - vừa vô nghĩa vừa làm tin trông thiếu thốn. Mỗi loại BĐS
  // có bộ thông số riêng (đất: mặt tiền/chiều dài/hình dáng; nhà: số tầng/nội thất/thang máy).
  const specs = (x.specs ?? null) as Record<string, string> | null;
  // các nhãn đã có ô riêng ở trên -> không lặp lại ở phần thông số nguồn
  const daCo = /^(hướng (nhà|đất)|pháp lý|giấy tờ pháp lý|loại sổ|tình trạng sổ|số tầng|nội thất|tổng diện tích đất|diện tích|phòng ngủ|phòng tắm|số phòng ngủ|số phòng tắm|thời hạn|hợp đồng|số người|người ở|thú cưng|giờ giấc|số xe)/i;

  // BẢNG 5 CHI PHÍ (audit 25/10): khách thuê quyết định liên hệ hay không dựa trên TỔNG tiền/tháng, không
  // chỉ giá phòng. Trước đây Điện/Nước/Phí quản lý (EvoHome ghi vào specs) lẫn trong lưới thông số, thiếu
  // dòng nào thì khách không biết là "không thu" hay "chưa có dữ liệu". Thiếu -> ghi rõ "Hỏi Radar".
  const giaTriSpec = (re: RegExp) => {
    const hit = Object.entries(specs || {}).find(([k, v]) => re.test(k) && v && String(v).trim() !== "-");
    return hit ? String(hit[1]) : null;
  };
  const PHI: [string, RegExp][] = [
    ["Điện", /^(tiền )?điện/i],
    ["Nước", /^(tiền )?nước/i],
    ["Gửi xe", /(gửi|giữ|để) xe/i],
    ["Dịch vụ", /dịch vụ|phí quản lý|phí chung/i],
  ];
  const laPhi = (k: string) => x.deal === "cho_thue" && PHI.some(([, re]) => re.test(k));
  const bangPhi: [string, string | null][] | null = x.deal === "cho_thue"
    ? [["Tiền phòng", fmtPrice(x.price_vnd, x.deal)], ...PHI.map(([nhan, re]) => [nhan, giaTriSpec(re)] as [string, string | null])]
    : null;
  const tienCoc = x.deal === "cho_thue" ? giaTriSpec(/cọc/i) : null;
  const soPhiCo = bangPhi ? bangPhi.filter(([, v]) => v).length : 0;
  // 3/11 (UX audit #15): ĐIỀU KHOẢN THUÊ - sau tổng tiền, khách hỏi nhiều nhất về cọc / hợp đồng / số người / thú cưng /
  // giờ giấc. Chỉ lấy khi specs hoặc mô tả NÓI RÕ; không nhắc thì ghi "Hỏi Radar", không đoán. Không dùng tienIchCua vì
  // luật khớp của bộ lọc nhận cả "không nuôi thú cưng" là có thú cưng.
  const chuTin = `${x.title || ""} ${x.description || ""}`.toLowerCase();
  const timChu = (re: RegExp) => chuTin.match(re)?.[0] ?? null;
  const thuCung = giaTriSpec(/thú cưng|pet/i)
    || (/không\s*(cho\s*|được\s*)?(nuôi\s*)?(thú cưng|pet|chó|mèo)/.test(chuTin) ? "Không cho nuôi"
    : x.amenities?.some((a) => a === "pet" || a === "thu_cung") || /(cho|được)\s*nuôi|nuôi\s*(thú cưng|chó|mèo|pet)|pet friendly/.test(chuTin) ? "Được nuôi" : null);
  const gioGiac = giaTriSpec(/giờ giấc/i)
    || (/giờ\s*(giấc\s*)?tự do|không chung chủ|riêng chủ/.test(chuTin) ? "Tự do" : null);
  const dieuKhoan: [string, string | null][] | null = x.deal === "cho_thue" ? [
    ["Tiền cọc", tienCoc],
    ["Hợp đồng tối thiểu", giaTriSpec(/thời hạn|hợp đồng/i) || timChu(/(hợp đồng|hđ)\s*(tối thiểu\s*)?\d+\s*(tháng|năm)/)],
    ["Số người ở", giaTriSpec(/số người|người ở/i) || timChu(/(tối đa|ở được)\s*\d+\s*người/)],
    ["Thú cưng", thuCung],
    ["Giờ giấc", gioGiac],
  ] : null;
  const thieuDieuKhoan = !!dieuKhoan?.some(([, v]) => !v);
  const coPhiPhu = !!bangPhi?.slice(1).some(([, v]) => v);
  const coDieuKhoan = !!dieuKhoan?.some(([, v]) => v);

  // Sáp nhập 1/7/2025: người đăng lúc ghi tên CŨ (quen miệng), lúc ghi tên MỚI. Các sàn lớn
  // đều hiện CẢ HAI để ai đọc cũng nhận ra chỗ đó - chotot: "Quận 11, TP.HCM (Phường Phú Thọ,
  // TP.HCM mới)", guland: "Tây Ninh (Mới) · Long An". Ta làm tương tự ở mức TỈNH (mức phường
  // cần bộ dữ liệu vài nghìn dòng, chưa có).
  const diaChiDayDu = (addr: string | null, quan: string | null, tinh: string | null) => {
    let diaChi = addr || "";
    if (diaChi.includes("Thông Tây Hội")) {
      diaChi = diaChi.replace("Phường Thông Tây Hội", "Phường Thông Tây Hội (Phường 9 cũ)");
    }
    return [diaChi, quan, nhanTinh(tinh)].filter(Boolean).join(", ") || "-";
  };

  const details: [string, ReactNode][] = [
    ...(x.direction ? [["Hướng", x.direction] as [string, ReactNode]] : []),
    ...(x.legal_status ? [["Pháp lý", <LegalHint key="legal" value={x.legal_status} />] as [string, ReactNode]] : []),
    ...(x.floors ? [["Số tầng", `${x.floors} tầng`] as [string, ReactNode]] : []),
    ...(x.furnishing ? [["Nội thất", x.furnishing] as [string, ReactNode]] : []),
    ...(x.amenities?.includes("parking") ? [["Chỗ đậu xe", "Có"] as [string, ReactNode]] : []),
    // thông số riêng của nguồn (guland: mặt tiền, chiều dài, hình dáng đất, số mặt tiếp giáp…)
    ...Object.entries(specs || {})
      .filter(([k, v]) => v && String(v).trim() !== "-" && !daCo.test(k) && !laPhi(k) && !(tienCoc && /cọc/i.test(k)))
      .slice(0, 14)
      .map(([k, v]) => [k, String(v)] as [string, ReactNode]),
  ];

  // KHỐI "THÔNG TIN CHÍNH" (29/9, kiểu Mogi): đứng ngay dưới ảnh, gom mọi con số khách cần so
  // (giá, DT, PN, loại, cọc, điện nước...) - trước đây nửa ở dải mỏng dưới ảnh, nửa ở "Chi tiết bất
  // động sản" sau mô tả (cách ~3 màn trên điện thoại; tin thiếu thông số thì khối đó chỉ còn "Mã tin").
  // rổ hàng: posted_at là ngày đối tác TẠO căn (có khi nửa năm trước) -> trông như tin cũ; cái khách
  // cần là phòng còn trống tới lúc nào = lần đồng bộ gần nhất
  const ngayDang = roHang ? x.last_seen_at || x.first_seen_at : x.posted_at || x.first_seen_at;
  const thongTin: [string, ReactNode][] = [
    ["Mức giá", <>{fmtPrice(x.price_vnd, x.deal)}{myPpm2 ? <span className="font-normal text-[var(--ink-faint)]"> · {fmtPpm2(myPpm2)}</span> : null}</>],
    ...(x.area_m2 ? [["Diện tích", `${x.area_m2} m²`] as [string, ReactNode]] : []),
    ...(x.bedrooms ? [["Phòng ngủ", `${x.bedrooms} phòng`] as [string, ReactNode]] : []),
    ...(x.bathrooms ? [["Phòng tắm", `${x.bathrooms} phòng`] as [string, ReactNode]] : []),
    ["Loại", PROP[x.kind]],
    ["Hình thức", x.deal === "ban" ? "Bán" : "Cho thuê"],
    ...(ngayDang ? [[roHang ? "Còn trống lúc" : x.posted_at ? "Ngày đăng" : "Radar thấy tin", new Date(ngayDang).toLocaleDateString("vi-VN")] as [string, ReactNode]] : []),
    ...details,
    [roHang ? "Mã phòng" : "Mã tin", roHang ? <span className="font-mono">{maPhong(x.id)}</span> : x.id.slice(0, 8)],
  ];

  // ---- JSON-LD (23/9, kiểm toán 4/11): chỉ khai báo dữ liệu ĐÃ hiển thị trên trang
  // (giá, diện tích, phòng, khu vực) - không bịa thêm thuộc tính.
  // Đã gỡ bỏ toàn bộ FAQPage ẩn (tránh rủi ro Google phạt manual action Spammy structured markup).
  const ldTin: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "RealEstateListing",
      "@id": `${SITE_URL}/listings/${x.id}#tin`,
      name: x.title,
      url: `${SITE_URL}/listings/${x.id}`,
      ...(x.description ? { description: catChu(x.description, 500) } : {}),
      ...(images.length ? { image: images.slice(0, 5) } : {}),
      ...(x.first_seen_at ? { datePosted: x.first_seen_at } : {}),
      ...(x.price_vnd
        ? {
            offers: {
              "@type": "Offer",
              price: x.price_vnd,
              priceCurrency: "VND",
              businessFunction:
                x.deal === "cho_thue"
                  ? "http://purl.org/goodrelations/v1#LeaseOut"
                  : "http://purl.org/goodrelations/v1#Sell",
              offeredBy: { "@id": `${SITE_URL}/#org` },
              availability: "https://schema.org/InStock",
              ...(x.deal === "cho_thue"
                ? {
                    priceSpecification: {
                      "@type": "UnitPriceSpecification",
                      price: x.price_vnd,
                      priceCurrency: "VND",
                      unitCode: "MON",
                    },
                  }
                : {}),
            },
          }
        : {}),
      ...(x.province
        ? {
            address: {
              "@type": "PostalAddress",
              addressCountry: "VN",
              addressRegion: x.province,
              addressLocality: [x.ward, x.district].filter(Boolean).join(", ") || undefined,
            },
          }
        : {}),
      ...(x.lat && x.lng ? { geo: { "@type": "GeoCoordinates", latitude: x.lat, longitude: x.lng } } : {}),
      ...(x.area_m2 ? { floorSize: { "@type": "QuantitativeValue", value: x.area_m2, unitCode: "MTK" } } : {}),
      ...(x.bedrooms ? { numberOfBedrooms: x.bedrooms } : {}),
      ...(x.bathrooms ? { numberOfBathroomsTotal: x.bathrooms } : {}),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Trang chủ", item: SITE_URL },
        {
          "@type": "ListItem",
          position: 2,
          name: `${DEAL_WORD[x.deal === "cho_thue" ? "cho_thue" : "ban"]} nhà đất`,
          item: SITE_URL + (x.deal === "cho_thue" ? "/nha-dat-cho-thue" : "/nha-dat-ban"),
        },
        ...(x.province
          ? [{ "@type": "ListItem", position: 3, name: x.province, item: SITE_URL + areaPath(x.deal === "cho_thue" ? "cho_thue" : "ban", x.province) }]
          : []),
        ...(x.province && x.district
          ? [{ "@type": "ListItem", position: 4, name: x.district, item: SITE_URL + areaPath(x.deal === "cho_thue" ? "cho_thue" : "ban", x.province, x.district) }]
          : []),
        { "@type": "ListItem", position: x.district ? 5 : 4, name: x.title, item: `${SITE_URL}/listings/${x.id}` },
      ],
    },
  ];

  return (
    <div>
      {ldTin.map((o, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(o) }} />)}
      <div className="flex items-center gap-3">
        <NutQuayLai fallbackHref="/search" />
        <span className="ml-auto flex items-center gap-2">
          <ChiaSe url={`${SITE_URL}/listings/${x.id}`} title={x.title} listingId={x.id} />
          <FavButton id={x.id} />
        </span>
      </div>

      {/* Thanh admin: chuyển sang client component để trang tin cache ISR 100% */}
      <AdminDetailBar id={x.id} status={x.status} isRoHang={roHang} />

      {/* Breadcrumb + tiêu đề + giá TRÊN gallery: khách từ Google phải thấy "tin gì, giá bao nhiêu" ngay màn hình đầu
          (UX audit 16/8: trước đây màn hình đầu chỉ có ảnh, giá/tiêu đề nằm dưới fold) */}
      <nav className="text-xs text-[var(--ink-soft)] mt-2 flex flex-wrap gap-1">
        <Link href="/" className="hover:text-brand">Trang chủ</Link><span>/</span>
        <Link href={x.deal === "ban" ? "/nha-dat-ban" : "/nha-dat-cho-thue"} className="hover:text-brand">{x.deal === "ban" ? "Mua bán" : "Cho thuê"}</Link>
        {x.province ? <><span>/</span><Link href={areaPath(x.deal, x.province)} className="hover:text-brand">{x.province}</Link></> : null}
        {x.province && x.district ? <><span>/</span><Link href={areaPath(x.deal, x.province, x.district)} className="hover:text-brand">{x.district}</Link></> : null}
      </nav>
      {isGone && (
        <div className="rounded-lg p-3.5 my-3 border border-amber-500/40 bg-amber-500/10 text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <b>Tin có thể đã giao dịch hoặc bị gỡ.</b> Radar không còn thấy tin này trên {roHang ? "rổ hàng" : x.source_site || "nguồn"} từ{" "}
            {lastSeen != null ? fresh(lastSeen) : "một thời gian"}. Tin đã ẩn khỏi kết quả tìm kiếm; giữ lại để tham khảo giá.
          </div>
          <Link
            href={x.province ? areaPath(x.deal, x.province, x.district) : `/search?deal=${x.deal}`}
            className="btn btn-primary whitespace-nowrap shrink-0 text-xs min-h-10"
          >
            Xem {x.deal === "ban" ? "nhà đất" : "phòng"} còn trống ở {x.district || x.province || "khu vực"} ›
          </Link>
        </div>
      )}
      {/* 28/10: điện thoại - giá đứng cạnh tiêu đề (shrink-0) bóp cột tiêu đề còn ~190px, chữ 24px vỡ 6 dòng và đẩy
          ảnh xuống cuối màn đầu. Dưới sm: tiêu đề full ngang cỡ h3, giá xuống ngay dưới tiêu đề; từ sm giữ 2 cột. */}
      <div className="flex flex-wrap justify-between gap-4 items-start mt-2">
        <div className="min-w-0 flex-1 basis-full sm:basis-0">
          {(roHang || giuPhong) && (
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              {roHang && (
                <NutChepMa ma={maPhong(x.id)} className="font-mono text-xs font-semibold bg-[var(--surface-2)] text-[var(--ink)] border border-[var(--line-strong)] px-2.5 py-0.5 rounded inline-flex items-center gap-1.5 cursor-pointer hover:border-brand active:scale-95 transition" />
              )}
              {giuPhong && <span className="font-bold text-white bg-red-600 px-2 py-0.5 rounded text-xs">{giuPhong}</span>}
            </div>
          )}
          {/* audit 25/10: text-slate-900 gán cứng -> tiêu đề TÀNG HÌNH ở dark mode (chữ tối trên nền tối). Dùng token theme. */}
          <h1 className="heading-1 max-sm:!text-h3 text-[var(--ink)] leading-snug">{x.title}</h1>
          <div className="sm:hidden mt-1.5 flex items-baseline gap-2">
            <span className="text-h2 text-brand font-extrabold tracking-tight">{fmtPrice(x.price_vnd, x.deal)}</span>
            {myPpm2 ? <span className="text-caption text-[var(--ink-faint)]">{fmtPpm2(myPpm2)}</span> : null}
          </div>
          <div className="text-[var(--ink-soft)] text-sm mt-1.5 flex items-center gap-1.5 font-medium">
            <MapPin className="w-4 h-4 text-[var(--ink-faint)] shrink-0" />
            <span>{diaChiDayDu(docQuyen ? cheSoNha(x.address) : x.address, x.district, x.province)}</span>
          </div>
          {/* Gộp 1 dòng xác minh + cam kết phí bên dưới địa chỉ để không đè nhiều tầng badge lên ảnh */}
          {roHang ? (
            <div className="flex flex-wrap items-center gap-2 mt-2 text-xs">
              <span className="font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded inline-flex items-center gap-1.5 border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                {x.deal === "ban"
                  ? "Rổ hàng Radar · Không thu phí dẫn xem"
                  : "Tin đã xác minh · Còn trống · Không phí dẫn xem"}
              </span>
            </div>
          ) : (
            <SourceBadge source={x.source} sourceSite={x.source_site} sourceUrl={x.source_url} postedAt={x.posted_at} firstSeenAt={x.first_seen_at} contactName={x.contact_name} />
          )}
        </div>
        <div className="hidden sm:flex text-right shrink-0 flex-col items-end gap-1.5">
          <div className="heading-1 text-brand tracking-tight font-extrabold">{fmtPrice(x.price_vnd, x.deal)}</div>
          {myPpm2 ? <div className="text-caption text-[var(--ink-faint)] font-semibold">{fmtPpm2(myPpm2)}</div> : null}
          {/* audit 25/10: bỏ cặp Yêu thích/Chia sẻ thứ 2 (đã có ở thanh trên) - bản này còn share sai domain radarnhadat.vn */}
        </div>
      </div>

      {/* Máy tính (29/9, kiểu Mogi): ảnh nằm TRONG cột trái để khung liên hệ đứng ngay cạnh ảnh và
          dính theo khi cuộn - trước đây cột phải chỉ bắt đầu dưới ảnh và trôi mất. Điện thoại: 1 cột như cũ. */}
      <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_360px] gap-6 mt-4 items-start">
        <div className="flex flex-col gap-4 min-w-0">
          {/* Gallery + lightbox - cap chiều cao để không đẩy hết nội dung xuống dưới fold */}
          <div className="[&_img]:max-h-[420px]">
            {images.length ? (
              <Gallery
                images={images}
                title={x.title}
                videos={layVideo(x.images)}
                nextListing={nextListingItem}
                currentListingId={x.id}
              />
            ) : (
              <div className="relative rounded-lg overflow-hidden aspect-[16/9] max-h-[440px] bg-slate-900 shadow-xs group border border-slate-800">
                {/* Background illustration photo */}
                <img
                  src={t.img}
                  alt={x.title}
                  className="w-full h-full object-cover brightness-[0.72] group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-black/20" />

                {/* Badge top-left */}
                <div className="absolute top-3 left-3 flex flex-wrap items-center gap-2 z-10">
                  <span className="px-2.5 py-1 rounded text-xs font-bold bg-white/95 text-slate-800 shadow-xs backdrop-blur-md flex items-center gap-1.5">
                    <span>{t.icon}</span>
                    <span>Ảnh minh hoạ {t.label || "phân khúc"}</span>
                  </span>
                  <span className="px-2 py-1 rounded text-[11px] font-medium bg-black/60 text-amber-200 backdrop-blur-md border border-white/10">
                    Nguồn gốc chưa có ảnh thực tế
                  </span>
                </div>

                {/* Bottom CTA bar */}
                <div className="absolute inset-x-4 bottom-4 sm:bottom-5 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3 text-white z-10">
                  <div className="max-w-lg">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
                      Hỗ trợ kiểm tra thực tế căn này
                    </span>
                    <h4 className="text-base sm:text-lg font-bold leading-snug line-clamp-2 text-white drop-shadow">
                      {x.title}
                    </h4>
                    <p className="text-xs text-slate-300 mt-0.5 hidden sm:block">
                      Radar hỗ trợ kết nối chủ/môi giới gửi ảnh chụp thực tế &amp; sổ hồng miễn phí qua Zalo.
                    </p>
                  </div>
                  {/* zalo.me bỏ qua ?text= -> NutZalo chép sẵn nội dung + mã, khách chỉ Dán */}
                  <NutZalo
                    listingId={x.id}
                    tinNhan={`Chào Radar, mình xem tin "${x.title}" (Mã: ${ma}). Nhờ bạn gửi giúp ảnh chụp thực tế & sổ của căn này qua Zalo nhé!`}
                    href={HOTLINE_ZALO}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto min-h-11 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xs transition-all active:scale-95 shrink-0"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Nhắn Zalo lấy ảnh thật &amp; sổ</span>
                  </NutZalo>
                </div>
              </div>
            )}
          </div>

          <MobileSectionJumper />

          {(roHang || docQuyen) && (
            <div className="lg:hidden">
              <ContactForm listingId={x.id} listingTitle={x.title} goiLaiNhanh />
            </div>
          )}

          <div id="tong-quan" className="card rounded-lg p-5 scroll-mt-28">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
              <h3 className="font-bold">Thông tin chính</h3>
              <span className="ml-auto flex flex-wrap items-center gap-2 text-sm">
                <ScoreInfo score={x.ai_score} trust={x.trust_score} canPhai />
                {(x.source_count ?? 1) > 1 ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-700" title={`Cùng tin này xuất hiện trên: ${(x.source_sites || []).join(", ")}`}>
                    ✓ {x.source_count} nguồn
                  </span>
                ) : null}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              {thongTin.map((d, idx) => (
                <div key={`${d[0]}-${idx}`} className="border-l-2 border-[var(--line)] pl-3 min-w-0">
                  <div className="text-xs text-[var(--ink-soft)]">{d[0]}</div>
                  <div className="font-semibold text-sm break-words">{d[1]}</div>
                </div>
              ))}
            </div>
          </div>
          {bangPhi && (
            <div id="chi-phi" className="card rounded-lg p-5 scroll-mt-28 border-t-2 border-t-brand">
              <div className="flex items-center justify-between gap-3 mb-3.5 flex-wrap">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base text-[var(--ink)]">Chi phí &amp; điều khoản thuê</h3>
                  {/* 3/11 (UX audit): bản cũ gắn "Minh bạch 100%" kể cả khi 4/5 dòng trống -> nói đúng số khoản đã có */}
                  <span className={`text-overline font-bold px-2 py-0.5 rounded-sm border whitespace-nowrap ${soPhiCo === bangPhi.length
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-brand border-emerald-200/60 dark:border-emerald-800/50"
                    : "bg-[var(--surface-2)] text-[var(--ink-soft)] border-[var(--line)]"}`}>
                    Đã có {soPhiCo}/{bangPhi.length} khoản phí
                  </span>
                </div>
              </div>
              <dl className="divide-y divide-[var(--line)] text-sm">
                {(coPhiPhu ? bangPhi : bangPhi.slice(0, 1)).map(([nhan, giaTri]) => (
                  <div key={nhan} className="flex items-center justify-between gap-3 py-2.5 min-h-11">
                    <dt className="text-[var(--ink-soft)] font-medium">{nhan}</dt>
                    <dd className={giaTri ? "font-bold text-[var(--ink)] text-right" : "text-xs text-[var(--ink-faint)] text-right"}>
                      {giaTri ? (
                        giaTri
                      ) : lienHeRadar ? (
                        <NutZalo
                          listingId={x.id}
                          tinNhan={`Chào Radar, cho mình hỏi tiền ${nhan.toLowerCase()} của ${roHang ? `phòng ${maPhong(x.id)}` : `tin ${x.id.slice(0, 8)}`} nhé.`}
                          href={HOTLINE_ZALO}
                          target="_blank"
                          rel="noopener"
                          className="text-brand hover:underline font-semibold cursor-pointer inline-flex items-center gap-0.5"
                        >
                          Hỏi Radar ›
                        </NutZalo>
                      ) : (
                        "Tin không ghi"
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
              {!coPhiPhu && (
                <p className="mt-2.5 text-xs text-[var(--ink-soft)] leading-relaxed">
                  {lienHeRadar
                    ? "Điện, nước, gửi xe, dịch vụ chưa có bảng phí chi tiết trên tin này. Nhắn Zalo để Radar báo trọn gói trước khi qua xem."
                    : "Tin không ghi chi tiết tiền điện, nước, gửi xe, dịch vụ."}
                </p>
              )}
              {dieuKhoan && coDieuKhoan && (
                <>
                  <h4 className="mt-4 mb-1 font-bold text-sm text-[var(--ink)]">Điều khoản thuê</h4>
                  <dl className="divide-y divide-[var(--line)] text-sm">
                    {dieuKhoan.map(([nhan, giaTri]) => (
                      <div key={nhan} className="flex items-center justify-between gap-3 py-2.5 min-h-11">
                        <dt className="text-[var(--ink-soft)] font-medium">{nhan}</dt>
                        <dd className={giaTri ? "font-bold text-[var(--ink)] text-right" : "text-xs text-[var(--ink-faint)] text-right"}>
                          {giaTri ? (
                            giaTri
                          ) : lienHeRadar ? (
                            <NutZalo
                              listingId={x.id}
                              tinNhan={`Chào Radar, cho mình hỏi về ${nhan.toLowerCase()} của ${roHang ? `phòng ${maPhong(x.id)}` : `tin ${x.id.slice(0, 8)}`} nhé.`}
                              href={HOTLINE_ZALO}
                              target="_blank"
                              rel="noopener"
                              className="text-brand hover:underline font-semibold cursor-pointer inline-flex items-center gap-0.5"
                            >
                              Hỏi Radar ›
                            </NutZalo>
                          ) : (
                            "Tin không ghi"
                          )}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </>
              )}
              {lienHeRadar && (soPhiCo < bangPhi.length || thieuDieuKhoan) && (
                <NutZalo listingId={x.id} tinNhan={`Chào Radar, cho mình hỏi đủ chi phí (điện, nước, gửi xe, dịch vụ) và điều khoản (cọc, hợp đồng, số người, thú cưng) của ${roHang ? `phòng ${maPhong(x.id)}` : `tin ${x.id.slice(0, 8)}`} nhé.`} href={HOTLINE_ZALO} target="_blank" rel="noopener" className="btn w-full mt-3 text-center border border-[#0068ff] text-[#0068ff] font-semibold flex items-center justify-center gap-2">
                  <MessageCircle className="w-4 h-4 text-[#0068ff] shrink-0" />
                  <span>{!coPhiPhu && !coDieuKhoan ? "Nhận bảng phí & điều khoản qua Zalo" : "Hỏi đủ chi phí & điều khoản qua Zalo"}</span>
                </NutZalo>
              )}
              {lienHeRadar && (
                <p className="mt-3.5 pt-3 border-t border-[var(--line)] text-xs text-[var(--ink-faint)]">Radar không thu phí xem phòng hay phụ phí môi giới</p>
              )}
            </div>
          )}
          {phongCungToa && phongCungToa.length > 0 && (
            <div className="card rounded-lg p-5">
              <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <div>
                  <h3 className="font-bold text-base text-[var(--ink)] flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-brand shrink-0" />
                    <span>Các phòng đang trống khác trong cùng tòa nhà ({phongCungToa.length})</span>
                  </h3>
                  <p className="text-xs text-[var(--ink-soft)] mt-0.5">
                    Cùng địa chỉ {x.address ? x.address.split(",")[0] : "này"}, bấm vào từng phòng để xem chi tiết
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {phongCungToa.slice(0, 12).map((p) => {
                  const maP = maPhong(p.id);
                  const loaiP = p.specs?.["Loại phòng"] || PROP[p.kind] || "Phòng";
                  const soP = p.title.match(/\(P\.([^)]+)\)/)?.[1];
                  return (
                    <Link
                      key={p.id}
                      href={`/listings/${p.id}`}
                      className="group flex items-center justify-between gap-3 p-3 rounded-sm border border-[var(--line)] bg-[var(--surface)] hover:border-brand transition"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-sm text-[var(--ink)] group-hover:text-brand transition-colors">
                            {soP ? `Phòng ${soP} · ${loaiP}` : loaiP}
                          </span>
                          <span className="font-mono text-[0.68rem] font-semibold px-1.5 py-0.5 rounded-xs bg-[var(--surface-2)] text-[var(--ink-soft)]">
                            {maP}
                          </span>
                        </div>
                        <div className="text-xs text-[var(--ink-soft)] mt-0.5 truncate">
                          {[p.area_m2 ? `${p.area_m2} m²` : null, p.floors ? `Lầu ${p.floors}` : null].filter(Boolean).join(" · ") || p.title}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-brand font-extrabold text-sm">
                          {fmtPrice(p.price_vnd, p.deal)}
                        </div>
                        <div className="text-[0.68rem] text-[var(--ink-faint)] group-hover:text-brand">
                          Xem phòng ›
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
          <div className="card rounded-lg p-5">
            <h3 className="font-bold mb-3">Mô tả</h3>
            {/* 17/8: trước dùng whitespace-pre-line -> tin dài (nhất là bài FB) thành khối chữ liền.
                RichText tách đoạn, và bài nào có "- " thì thành gạch đầu dòng cho dễ quét. */}
            <MoTaThuGon>
              <RichText text={cheSoVanBan(x.description, docQuyen)} className="[&_p]:text-[var(--ink)] [&_p]:text-base [&_li]:text-base" />
            </MoTaThuGon>
          </div>
          <div id="phan-tich-gia" className="scroll-mt-28" />
          {/* So sánh giá với mặt bằng khu vực (data thật) */}
          {/* 2/10: phòng rổ hàng (hàng mình bán) không tự dán nhãn "Cao hơn mặt bằng ~147%": mẫu so là phòng trọ
              Chợ Tốt giá rẻ, không cùng hạng (studio full nội thất Q1). Chỉ hiện khi RẺ hơn - là lợi thế bán hàng. */}
          {diffPct != null && med && (!roHang || diffPct <= -5) && (
            <div className={`card rounded-lg p-4 text-sm ${
              diffPct <= -5 ? "border-emerald-500/40 bg-emerald-500/5"
              : diffPct >= 10 ? "border-red-500/40 bg-red-500/5"
              : "border-[var(--line)]"
            }`}>
              <div className="flex items-center gap-2 font-bold mb-1">
                Đánh giá mức giá
                <span className={`text-xs px-2.5 py-0.5 rounded-md font-bold ${
                  diffPct <= -5 ? "bg-emerald-600 text-white"
                  : diffPct >= 10 ? "bg-red-500/15 text-red-600"
                  : "bg-slate-100 text-slate-700"
                }`}>
                  {diffPct <= -5 ? `Giá tốt · Rẻ hơn khu vực ~${Math.abs(diffPct)}%` : diffPct >= 10 ? `Cao hơn mặt bằng ~${diffPct}%` : "Đúng giá thị trường"}
                </span>
              </div>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
                Đơn giá: <b>{fmtPpm2(myPpm2!)}</b> (Mặt bằng chung {ppm2s.length} tin {PROP[x.kind].toLowerCase()} tại {x.district} thường dao động từ <b>{p25 ? fmtPpm2(p25) : fmtPpm2(med)}</b> đến <b>{p75 ? fmtPpm2(p75) : fmtPpm2(med)}</b>).
                <span className="text-slate-400 block mt-1 text-xs">Dữ liệu được Radar tổng hợp đối soát tự động từ các nguồn tin trong khu vực.</span>
              </p>
            </div>
          )}
          {!enoughComps && !roHang && myPpm2 && x.district ? (
            <div className="card rounded-lg p-4 text-sm text-[var(--ink-soft)]">
              <b className="text-[var(--ink)]">So sánh giá:</b> chưa đủ dữ liệu - mới có {ppm2s.length} tin {PROP[x.kind].toLowerCase()} {x.deal === "ban" ? "bán" : "cho thuê"} khác tại {x.district} (cần ≥{MIN_COMPS}). Radar không đưa ra kết luận khi mẫu quá nhỏ.
            </div>
          ) : null}
          {/* Xu hướng giá khu vực từ price_history (snapshot mỗi sáng) - trước đây bảng có mà chi tiết tin không dùng */}
          {x.province ? <PriceTrend province={x.province} district={x.district} kind={x.kind} deal={x.deal} /> : null}

          {/* Tin nằm trong dự án -> lối sang trang dự án xem toàn bộ tin đang rao ở đó */}
          {duAn && (
            <div className="card rounded-lg p-4 text-sm flex items-center gap-3 flex-wrap">
              <div>
                <div className="text-xs text-[var(--ink-soft)] mb-0.5">Thông tin dự án</div>
                <div className="font-bold flex items-center gap-1.5"><Building2 className="w-4 h-4 text-brand" /> {duAn.name}</div>
                {duAn.investor && <div className="text-xs text-[var(--ink-soft)]">Chủ đầu tư: {duAn.investor}</div>}
              </div>
              <Link href={`/projects/${duAn.id}`} className="btn text-sm ml-auto whitespace-nowrap">
                Xem dự án · {tinCungDuAn} tin đang rao ›
              </Link>
            </div>
          )}

          {/* Dấu hiệu chính chủ / môi giới - từ DỮ LIỆU (tần suất tài khoản, nguồn ghi nhận, nội dung), nêu rõ lý do */}
          {roleGuess === "moi_gioi" && (
            <div className="card rounded-lg p-4 border-sky-500/40 bg-sky-500/5 text-sm">
              <div className="font-bold mb-1">Có dấu hiệu môi giới</div>
              {reasons.length ? (
                <ul className="list-disc pl-5 text-[var(--ink-soft)] mb-1">{reasons.map((r) => <li key={r}>{r}</li>)}</ul>
              ) : null}
              <p className="text-[var(--ink-faint)] text-xs">
                Nhận định từ dữ liệu Radar (tần suất đăng, nguồn ghi nhận, nội dung tin) - không phải xác minh danh tính. Hãy kiểm tra kỹ trước khi đặt cọc.
              </p>
            </div>
          )}
          {roleGuess === "chu_nha" && (
            <div className="card rounded-lg p-4 border-emerald-500/40 bg-emerald-500/5 text-sm">
              <div className="font-bold mb-1">Có dấu hiệu chính chủ</div>
              {reasons.length ? (
                <ul className="list-disc pl-5 text-[var(--ink-soft)] mb-1">{reasons.map((r) => <li key={r}>{r}</li>)}</ul>
              ) : null}
              <p className="text-[var(--ink-faint)] text-xs">Nhận định từ dữ liệu Radar, không phải xác minh. Vẫn nên xác minh sổ/giấy tờ khi giao dịch.</p>
            </div>
          )}
          {x.price_flag ? (
            <div className="card rounded-lg p-4 border-amber-500/40 bg-amber-500/5 text-amber-700 text-sm">
              <div className="font-bold flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Cảnh báo mức giá
              </div>
              tin này {x.price_flag.reason === "cao_hon" ? "cao" : "thấp"} hơn{" "}
              {Math.abs(x.price_flag.deviation_pct)}% so với trung vị {x.price_flag.cluster_size} tin cùng loại trong quận
              ({x.price_flag.distinct_posters} người đăng khác nhau, so theo {x.price_flag.basis === "gia" ? "giá" : "giá/m²"}). Nên kiểm tra kỹ.
            </div>
          ) : null}

          {/* Công cụ ra quyết định tại chỗ (ISO 9241-110): trả góp cho tin bán */}
          {x.deal === "ban" && x.price_vnd && x.price_vnd >= 3e8 ? <MortgageMini price={x.price_vnd} /> : null}
          {/* Hỏi đáp tích luỹ từ Cầu Nối: buyer hỏi qua bot, seller trả lời -> lưu listing_facts,
              buyer SAU đọc được luôn không phải hỏi lại. Che SĐT khi hiển thị công khai. */}
          {hoiDap.length > 0 && (
            <div className="card rounded-lg p-5">
              <h3 className="font-bold mb-3">Hỏi đáp với người đăng <span className="text-xs font-normal text-[var(--ink-soft)]">(qua Radar)</span></h3>
              <div className="flex flex-col gap-3 text-sm">
                {hoiDap.map((f) => (
                  <div key={f.id}>
                    <div className="font-semibold flex items-center gap-1.5"><HelpCircle className="w-4 h-4 text-slate-400" /> {cheSoVanBan(f.question)}</div>
                    <div className="text-[var(--ink-soft)] mt-0.5 ml-5.5 flex items-start gap-1.5"><MessageSquare className="w-3.5 h-3.5 text-slate-400 mt-1 shrink-0" /> {cheSoVanBan(f.answer)}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-[var(--ink-faint)] mt-3">Muốn hỏi thêm hoặc hẹn xem: liên hệ với chuyên viên Radar ở khung bên cạnh.</p>
            </div>
          )}
          <div id="vi-tri-tien-ich" className="scroll-mt-28" />
          {x.amenities?.length ? (
            <div className="card rounded-lg p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold">Tiện ích</h3>
                <span className="text-xs text-[var(--ink-faint)]">Bấm để tìm thêm căn tương tự</span>
              </div>
              <div className="flex flex-wrap gap-2 text-sm">
                {x.amenities.map((a) => {
                  const ten = AMEN[a] || nhanTienIch(a) || a;
                  const searchUrl = `/search?deal=${x.deal || "cho_thue"}${x.province ? `&province=${encodeURIComponent(x.province)}` : ""}${x.district ? `&district=${encodeURIComponent(x.district)}` : ""}&ti=${encodeURIComponent(a)}`;
                  return (
                    // 29/10: /search là trang động không cache -> nofollow (bot khỏi cào tổ hợp lọc) + tắt prefetch
                    // (mỗi lượt xem tin không bắn thêm request /search tốn Fast Origin Transfer)
                    <Link
                      key={a}
                      href={searchUrl}
                      prefetch={false}
                      rel="nofollow"
                      title={`Tìm bất động sản có ${ten} tại ${x.district || x.province || "khu vực này"}`}
                      className="px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--bg)] hover:border-brand hover:text-brand transition text-sm inline-flex items-center gap-1.5"
                    >
                      <span>{ten}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : null}
          <div className="card rounded-lg p-5">
            <h3 className="font-bold mb-2">Vị trí</h3>
            <div className="text-sm text-[var(--ink-soft)] mb-3 flex items-center gap-1">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{diaChiDayDu(docQuyen ? cheSoNha(x.address) : x.address, x.district, x.province)}</span>
            </div>
            {x.lat != null && x.lng != null ? (
              <>
                <ListingMap lat={x.lat} lng={x.lng} title={x.title} deal={x.deal} currentId={x.id} priceVnd={x.price_vnd} />
                {/* Tiện ích quanh đây (ISO 9241-110): mở Google Maps tìm quanh toạ độ - không cần API trả phí */}
                <div className="flex flex-wrap gap-2 mt-3 text-xs">
                  <span className="text-[var(--ink-soft)] self-center">Quanh đây:</span>
                  {[["Trường học", "trường học"], ["Bệnh viện", "bệnh viện"], ["Chợ / siêu thị", "chợ siêu thị"], ["Bến xe buýt", "trạm xe buýt"]].map(([label, q]) => (
                    <a key={q} href={`https://www.google.com/maps/search/${encodeURIComponent(q)}/@${x.lat},${x.lng},15z`} target="_blank" rel="noopener" className="btn !py-1.5 !px-2.5 text-xs">{label}</a>
                  ))}
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${x.lat},${x.lng}`} target="_blank" rel="noopener" className="btn !py-1.5 !px-2.5 text-xs">Chỉ đường</a>
                </div>
              </>
            ) : (
              <div className="h-56 rounded-xl grid place-items-center text-[var(--ink-soft)] bg-[var(--bg)] border border-[var(--line)] text-sm">
                <span className="flex items-center gap-1"><MapPin className="w-4 h-4 text-slate-400" /> Tin này chưa có toạ độ chính xác</span>
              </div>
            )}
          </div>

          {/* Bất động sản / Phòng tương tự theo thuật toán FR-31 - tránh lặp 2 dải thẻ gần nhau */}
          {tinTuongTu && tinTuongTu.length > 0 ? (
            <SimilarListings id="tin-lien-quan" items={tinTuongTu} loaiBDS={x.kind} />
          ) : null}

          {/* Khối giữ chân khách vãng lai: Chưa ưng căn này? Nhắn Zalo Radar */}
          <div className="card rounded-lg p-5 border border-emerald-300/80 bg-emerald-50/40 dark:bg-emerald-950/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-base font-bold text-[var(--ink)]">
                  Chưa chọn được căn ưng ý ở {x.district || "khu vực này"}?
                </h4>
                <p className="text-xs sm:text-sm text-[var(--ink-soft)] max-w-xl leading-relaxed">
                  Nhắn qua Zalo mức giá bạn cần và khu vực muốn ở, tụi mình lọc nhanh 3 căn đang trống {x.district ? `tại ${x.district} ` : ""}gửi bạn xem trong 15 phút.
                </p>
              </div>
              <NutZalo
                listingId={x.id}
                tinNhan={`Chào Radar, mình đang xem tin Mã: ${ma} tại ${x.district || ""} nhưng muốn tìm thêm các căn tương tự tầm giá ${fmtPrice(x.price_vnd, x.deal)}, tư vấn giúp mình nhé!`}
                href={HOTLINE_ZALO}
                target="_blank"
                rel="noopener"
                className="btn btn-primary whitespace-nowrap px-5 py-2.5 rounded-lg font-bold flex items-center justify-center gap-2 shadow-sm shrink-0"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Nhận rổ hàng tương tự qua Zalo</span>
              </NutZalo>
            </div>
          </div>
        </div>

        {/* lg: sticky giữ nguyên khung liên hệ (#lien-he + Độ mới), bỏ overflow-y-auto nội bộ để khỏi kẹt scrollbar */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-20 lg:self-start">
          <div className="card rounded-lg p-5" id="lien-he">
            <h3 className="font-bold mb-3">{roHang ? (x.deal === "ban" ? "Liên hệ xem nhà" : "Liên hệ xem phòng") : isCrawl ? "Liên hệ" : "Liên hệ người bán"}</h3>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 rounded-lg grid place-items-center text-white font-bold bg-[#0f172a] text-xs shrink-0">
                {roHang ? "RADAR" : x.source === "agent" ? "BÁN" : "TIN"}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm truncate">
                  {roHang ? (x.contact_name || "Phụ trách rổ hàng Radar") : (x.contact_name || (x.source === "agent" ? "Người bán tự đăng" : `Người đăng trên ${tenTrang(x.source_site)}`))}
                </div>
                <div className="text-xs text-[var(--ink-soft)]">
                  {roHang
                    ? "Đã xác minh · Dẫn xem miễn phí"
                    : docQuyen
                      ? "Tin độc quyền · Liên hệ qua Radar"
                      : coSoDeMo
                        ? "Bấm Chat Zalo hoặc Hiện số để liên hệ"
                        : "Xem bài gốc để liên hệ người đăng"}
                </div>
              </div>
            </div>

            <div className="mb-3">
              <PhoneReveal
                phoneMasked={x.phone_masked}
                listingId={x.id}
                listingTitle={x.title}
                hasPhone={coSoDeMo}
                isRadar={laCuaMinh}
                sourceUrl={x.source_url}
              />
            </div>

            {roHang && (
              <div className="mb-3 flex flex-col gap-2.5">
                <p className="text-[11px] text-[var(--ink-soft)] leading-relaxed">
                  Mã {x.deal === "ban" ? "căn" : "phòng"} (tự chép khi bấm Zalo):{" "}
                  <NutChepMa ma={maPhong(x.id)} loai={x.deal === "ban" ? "căn" : "phòng"} className="font-mono font-bold text-[var(--ink)] underline cursor-pointer inline-flex items-center gap-1" />
                </p>
                {/* QR chỉ có ích trên máy tính: quét bằng điện thoại là mở chat Zalo, khỏi gõ số */}
                <div className="hidden lg:flex items-center gap-3 rounded-lg border border-[var(--line)] p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/zalo-qr.svg" alt={`QR Zalo ${HOTLINE}`} width={88} height={88} className="rounded bg-white p-1 shrink-0" />
                  <div className="text-xs text-[var(--ink-soft)]">
                    <div className="font-bold text-sm text-[var(--ink)] mb-0.5">Quét để nhắn Zalo</div>
                    Mở camera quét mã, gửi <b className="font-mono text-[var(--ink)]">{maPhong(x.id)}</b> để hẹn xem miễn phí.
                  </div>
                </div>
              </div>
            )}

            {docQuyen && !roHang && (
              <div className="mb-3 rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3 text-xs text-[var(--ink-soft)]">
                <div className="font-bold mb-1 text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 text-sm">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>Hỗ trợ kết nối qua Radar</span>
                </div>
                Tin trong nhóm Zalo/Facebook được Radar giữ kín SĐT gốc và hỗ trợ đi xem cùng bạn miễn phí.
              </div>
            )}

            {/* Tin crawl web: link "Xem bài gốc" để sẵn bên dưới 2 nút Chat Zalo & Hiện số */}
            {isCrawl && !docQuyen && x.source_url && x.source_url !== "#" ? (
              <a href={x.source_url} target="_blank" rel="noopener nofollow" className="btn w-full text-center block mb-3 !whitespace-normal">
                Xem bài gốc &amp; liên hệ trên {tenTrang(x.source_site)} ›
              </a>
            ) : null}

            {/* Độc quyền (không phải rổ hàng): giữ ghi nguồn nhỏ gọn */}
            {docQuyen && !roHang && x.source_url && x.source_url !== "#" && (
              <p className="text-[0.68rem] text-[var(--ink-faint)] mb-3">
                Nguồn tin: <a href={x.source_url} target="_blank" rel="noopener nofollow" className="underline">{x.source_site || "bài gốc"}</a>
              </p>
            )}

            {x.agent_id && (
              <Link
                href={`/tin-nhan?listing=${x.id}&agent=${x.agent_id}`}
                className="btn w-full text-center block mb-3"
              >
                Nhắn tin với người bán
              </Link>
            )}

            {isCrawl && !docQuyen ? (
              <details className="mt-2 rounded-lg border border-[var(--line)] bg-[var(--surface-2)]/50 p-3">
                <summary className="text-sm font-semibold cursor-pointer text-brand list-none flex items-center justify-between gap-2">
                  <span>Nhờ Radar tìm &amp; lọc căn tương tự miễn phí</span>
                  <span className="text-xs font-bold shrink-0">Mở form ›</span>
                </summary>
                <p className="text-xs text-[var(--ink-soft)] my-2">Để lại SĐT - Radar (không phải người đăng tin này) sẽ liên hệ tư vấn các tin phù hợp đang còn trong khu vực.</p>
                <ContactForm listingId={x.id} listingTitle={x.title} viaRadar />
              </details>
            ) : !laCuaMinh ? (
              <ContactForm listingId={x.id} listingTitle={x.title} />
            ) : null}
            {x.agent_id && (
              <div className="mt-4 pt-4 border-t border-[var(--line)]">
                <AppointmentForm listingId={x.id} agentId={x.agent_id} />
              </div>
            )}
            {!isCrawl && !roHang && x.source_url && x.source_url !== "#" ? (
              <a
                href={x.source_url}
                target="_blank"
                rel="noopener nofollow"
                className="block text-center mt-3 text-sm text-brand font-semibold"
              >
                Xem bài gốc trên {x.source_site || "nguồn"} ›
              </a>
            ) : null}
            <div className="mt-3 pt-3 border-t border-[var(--line)] flex justify-between items-start gap-2">
              <span className="text-[0.68rem] text-[var(--ink-faint)]">Mã tin: <code>{x.id.slice(0, 8)}</code></span>
              <ReportButton listingId={x.id} />
            </div>
          </div>

          {/* Độ mới của tin - 3 mốc: đăng trên nguồn / Radar thấy lần đầu / thấy gần nhất */}
          <div className="card rounded-lg p-5 text-sm">
            <h3 className="font-bold mb-2">Độ mới của tin</h3>
            <div className="grid grid-cols-[1fr_auto] gap-y-1.5">
              {x.posted_at && !roHang ? (<>
                <span className="text-[var(--ink-soft)]">Đăng trên {x.source_site || "nguồn"}</span>
                <span className="font-semibold">{fmtDT(x.posted_at)}</span>
              </>) : null}
              <span className="text-[var(--ink-soft)]">Radar thấy tin</span>
              <span className="font-semibold" title={fmtDT(x.first_seen_at)}>{seen != null ? fresh(seen) : "-"}</span>
              <span className="text-[var(--ink-soft)]">Thấy gần nhất</span>
              <span className={`font-semibold ${isGone ? "text-amber-600" : ""}`} title={fmtDT(x.last_seen_at ?? x.crawled_at)}>
                {lastSeen != null ? fresh(lastSeen) : (x.crawled_at ? fmtDT(x.crawled_at) : "-")}
                {x.crawl_count && x.crawl_count > 1 ? <span className="text-[var(--ink-faint)] font-normal"> · {x.crawl_count} lần</span> : null}
              </span>
              <span className="text-[var(--ink-soft)]">Nguồn</span>
              <span className="font-semibold">
                {x.source === "agent" || roHang ? tenNguon(x) : (x.source_sites && x.source_sites.length > 1 ? [...new Set(x.source_sites.map(tenTrang))].join(" + ") : tenTrang(x.source_site))}
              </span>
              {x.trust_score ? (
                <div className="col-span-2 flex items-center justify-between pt-1 border-t border-[var(--line)]">
                  <span className="text-[var(--ink-soft)] flex items-center gap-1">
                    <span>Độ đầy đủ tin</span>
                    <ScoreInfo score={x.trust_score} canPhai />
                  </span>
                  <span className="font-semibold text-brand">{x.trust_score}/100</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile: thanh CTA dính đáy - khối liên hệ nằm cuối trang, khách phải cuộn 4-5 màn (UX audit).
          Bù padding-bottom cho body qua div dưới. Vùng chạm chuẩn ≥44px (48px) tối ưu ngón cái. */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-30 border-t border-[var(--line)] bg-[var(--surface)] shadow-[0_-4px_16px_rgba(0,0,0,0.08)] px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] flex items-center gap-2.5">
        <div className="min-w-0 flex-1">
          <div className="text-brand font-extrabold leading-tight text-base sm:text-lg">{fmtPrice(x.price_vnd, x.deal)}</div>
          <div className="text-[0.7rem] text-[var(--ink-soft)] truncate mt-0.5">
            {[x.area_m2 ? `${x.area_m2} m²` : null, x.district].filter(Boolean).join(" · ")}
          </div>
        </div>
        <PhoneReveal
          phoneMasked={x.phone_masked}
          listingId={x.id}
          listingTitle={x.title}
          hasPhone={coSoDeMo}
          isRadar={laCuaMinh}
          sourceUrl={x.source_url}
          cheDo="mobile"
        />
      </div>
      {/* Tin khác của cùng người đăng (kiểu hồ sơ môi giới batdongsan "đang có N tin") */}
      {posterOthers.length > 0 && (
        <section className="mt-12">
          <h2 className="prata text-xl mb-1">Người đăng này còn {posterCount ?? posterOthers.length} tin khác</h2>
          <p className="text-xs text-[var(--ink-soft)] mb-4">Gom theo tài khoản đăng trên {x.source_site || "nguồn"} - {(posterCount ?? 0) >= 3 ? "nhiều tin cùng lúc thường là môi giới/sàn." : "ít tin, có thể là chính chủ."}</p>
          <HangVuot motHang items={posterOthers.map((r) => ({ key: r.id, node: <ListingCard x={r} /> }))} />
        </section>
      )}

      {/* Vị trí quảng cáo AdSense tài trợ (tự ẩn nếu chưa có client ID / slot) */}
      <AdSenseBanner />

      {/* Tin liên quan (chỉ hiện nếu khối Tin tương tự ở trên chưa có dữ liệu) */}
      {(!tinTuongTu || tinTuongTu.length === 0) && related.length > 0 && (
        <section id="tin-lien-quan" className="mt-12 scroll-mt-28">
          <h2 className="prata text-xl mb-4">
            {PROP[x.kind]} liên quan tại {x.district || x.province}
          </h2>
          <HangVuot motHang items={related.map((r) => ({ key: r.id, node: <ListingCard x={r} /> }))} />
        </section>
      )}
      {/* NN/g #6: nhớ tin đã xem (localStorage) + hiện dải "Đã xem gần đây" */}
      {/* SEO Internal Linking: Điều hướng ngữ cảnh theo khu vực */}
      {(x.district || x.province) && (
        <section className="mt-12 p-5 rounded-md bg-[var(--surface)] border border-[var(--line)] text-sm">
          <h2 className="font-bold text-base mb-3 text-[var(--ink)]">
            Khám phá bất động sản tại {x.district ? `${x.district}, ${x.province || ""}` : x.province}
          </h2>
          <div className="flex flex-wrap gap-2">
            {linkKV.map((l) => (
              <Link key={l.href} href={l.href} className="px-3 py-1.5 rounded border border-[var(--line)] hover:border-brand hover:text-brand transition text-xs font-medium">
                {l.nhan} ›
              </Link>
            ))}
            {x.province && (
              <Link href={`/thong-ke?deal=${x.deal}&city=${encodeURIComponent(x.province)}`} className="px-3 py-1.5 rounded-lg border border-[var(--line)] hover:border-brand hover:text-brand transition text-xs font-medium">
                Biến động giá tại {x.province} ›
              </Link>
            )}
            <Link href="/dinh-gia" className="px-3 py-1.5 rounded-lg border border-[var(--line)] hover:border-brand hover:text-brand transition text-xs font-medium">
              Định giá BĐS bằng AI ›
            </Link>
          </div>
        </section>
      )}

      <GhiXemTin listingId={x.id} />
      <RecentlyViewedTracker item={{ id: x.id, title: x.title, price: fmtPrice(x.price_vnd, x.deal), where: [x.district, x.province].filter(Boolean).join(", "), img: images[0] || null }} />
      <RecentlyViewed excludeId={x.id} />
      {/* chừa chỗ cho thanh CTA dính đáy trên mobile */}
      <div className="lg:hidden h-[calc(4.5rem+env(safe-area-inset-bottom))]" aria-hidden />
    </div>
  );
}
