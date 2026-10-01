export const dynamic = "force-dynamic";

import { createAnonClient } from "@/lib/supabase/anon";   // KHÔNG cookie -> cache được (30/9)
import { unstable_cache } from "next/cache";
import { gonChoDanhSach } from "@/lib/img";
import type { Listing } from "@/lib/types";
import { canonDistrict, startOfDayVN } from "@/lib/format";
import { getAreas } from "@/lib/geo";
import { LISTING_CARD_COLS } from "@/lib/cols";
import { tinhCuGopVao } from "@/lib/sap-nhap";
import SearchClient, { type DieuHuong } from "./SearchClient";
import { cheTinDocQuyen } from "@/lib/doc-quyen";
import { tronRoHang } from "@/lib/ro-hang";

// /search KHÔNG tham số là trang có ích (điểm vào bộ lọc) -> để index.
// /search?... là vô số tổ hợp nội dung mỏng/trùng với trang khu vực -> noindex, follow (23/9).
// Trang khu vực (/nha-dat-ban/[tinh]/[quan]/[loai]) mới là bản để Google lập chỉ mục.
export async function generateMetadata({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const coLoc = Object.entries(sp).some(([k, v]) => v && k !== "page");
  return {
    title: "Tìm kiếm bất động sản - NhaDat Radar",
    description: "Lọc tin nhà đất bán và cho thuê theo khu vực, mức giá, diện tích, số phòng; xem giá trung vị khu vực và cảnh báo giá lệch.",
    alternates: { canonical: "/search" },
    robots: coLoc ? { index: false, follow: true } : { index: true, follow: true },
  };
}

// KẾT QUẢ TÌM KIẾM CÓ CACHE 5 PHÚT theo bộ lọc (30/9). Trước đây force-dynamic: MỌI lượt xem (kể cả bot) là
// 4 truy vấn Supabase kéo ~250 tin kèm nguyên mô tả -> nguồn egress Supabase lớn nhất + trang chậm khi DB bận.
// Dữ liệu chỉ đổi mỗi lượt crawl (vài tiếng) nên trễ tối đa 5 phút là chấp nhận được. Client ẩn danh vì dữ
// liệu công khai, không phụ thuộc người xem.
// Chỉ gửi xuống trình duyệt các trường thẻ tin / bản đồ / bộ đếm thực sự dùng (ListingRow, ListingCard,
// SearchClient, MapResults - soát 30/9). Bỏ source_url, ward, trust_score, poster_role_guess, status và
// 3 mốc thời gian không hiển thị: 200 tin × ~8 trường thừa là cả trăm KB mỗi lượt xem.
const TRUONG_THE = ["id", "source", "source_site", "source_count", "source_sites", "deal", "kind", "title", "description",
  "price_vnd", "area_m2", "price_per_m2", "bedrooms", "bathrooms", "province", "district", "lat", "lng", "images",
  "so_anh", "co_video", "ai_score", "price_flag", "first_seen_at"] as const;
const chiTruongThe = (x: Listing) =>
  Object.fromEntries(TRUONG_THE.filter((k) => x[k as keyof Listing] != null).map((k) => [k, x[k as keyof Listing]])) as unknown as Listing;

const KHOA_LOC = ["deal", "kind", "province", "district", "ward", "priceMin", "priceMax", "areaMin", "areaMax", "bedrooms", "q", "sort", "own", "legal", "direction", "newAddr", "agent"] as const;
const timKiemCoCache = unstable_cache(
  async (sp: Record<string, string | undefined>) => {
  const { kind, province, district, ward, priceMin, priceMax, areaMin, areaMax, bedrooms, q, sort, own, legal, direction, newAddr, agent } = sp;
  // URL có lọc giá mà không có deal (dán tay / link cũ): hiểu theo thang tỷ như UI đang hiện
  // (SearchClient.push cũng ép vậy) - không thì mọi tin thuê đều lọt lưới "dưới X tỷ".
  const deal = sp.deal === "ban" || sp.deal === "cho_thue" ? sp.deal : priceMin || priceMax ? "ban" : undefined;
  const supabase = createAnonClient();

  // Làm sạch input trước khi đưa vào ilike/or của PostgREST: %/_ là wildcard, ",()" phá cú pháp .or() (audit 16/8: province/district/ward từng đưa thẳng)
  const clean = (s: string) => s.replace(/[%_*,()]/g, " ").replace(/\s+/g, " ").trim();
  // Bộ lọc dùng chung cho danh sách + đếm (cùng điều kiện)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyFilters = <T extends { eq: any; ilike: any; gte: any; lte: any; or: any }>(query: T): T => {
    if (deal === "ban" || deal === "cho_thue") query = query.eq("deal", deal);
    if (own === "1") query = query.eq("source", "agent"); // chỉ tin chính chủ tự đăng trên sàn
    // ?agent=<uuid> từ nút "Xem tin đăng" trang /agents - trước đây link đó truyền ?q=<tên
    // người bán> mà q chỉ tìm trong tiêu đề/địa chỉ nên luôn 0 kết quả
    if (agent && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(agent)) query = query.eq("agent_id", agent);
    if (kind) query = query.eq("kind", kind);
    // Công tắc "Địa chỉ mới sau sáp nhập" BẬT -> lọc theo địa giới 2025: chọn "Hồ Chí Minh"
    // thì trả về CẢ tin còn ghi "Bình Dương" / "Bà Rịa - Vũng Tàu", vì nguồn vẫn dùng tên tỉnh cũ.
    // TẮT (mặc định) -> đúng tên tỉnh như nguồn ghi, giữ thói quen tìm của thị trường.
    if (province) {
      const cu = newAddr === "1" ? tinhCuGopVao(province) : [];
      if (cu.length) {
        query = query.or([province, ...cu].map((p) => `province.ilike.%${clean(p)}%`).join(","));
      } else {
        query = query.ilike("province", `%${clean(province)}%`);
      }
    }
    // district trong DB đã chuẩn hoá (merge.mjs canonDistrict + UPDATE 16/8) -> so KHỚP CHÍNH XÁC, không còn prefix + post-filter
    if (district) query = query.eq("district", canonDistrict(district));
    if (ward) query = query.ilike("ward", `%${clean(ward)}%`);
    if (priceMin && !Number.isNaN(Number(priceMin))) query = query.gte("price_vnd", Number(priceMin));
    if (priceMax && !Number.isNaN(Number(priceMax))) query = query.lte("price_vnd", Number(priceMax));
    if (areaMin && !Number.isNaN(Number(areaMin))) query = query.gte("area_m2", Number(areaMin));
    if (areaMax && !Number.isNaN(Number(areaMax))) query = query.lte("area_m2", Number(areaMax));
    if (bedrooms && !Number.isNaN(Number(bedrooms))) query = query.gte("bedrooms", Number(bedrooms));
    // bộ lọc nâng cao (NN/g #7): pháp lý & hướng - khớp chuỗi mềm vì nguồn ghi tự do ("Sổ hồng riêng", "Đông Nam")
    if (legal) query = query.ilike("legal_status", `%${clean(legal)}%`);
    // cả cụm ("Tây Nam"), không cắt lấy chữ đầu - split(" ")[0] làm "Tây Nam" lọc thành
    // "Tây" và trả về lẫn cả Tây Bắc, 4 lựa chọn hướng ghép thành vô nghĩa (soát 21/8)
    if (direction) query = query.ilike("direction", `%${clean(direction)}%`);
    if (q) {
      // Học flow batdongsan: từ khoá khớp cả tiêu đề + địa chỉ/đường + phường + quận
      const safe = clean(q);
      if (safe) query = query.or(`title.ilike.%${safe}%,address.ilike.%${safe}%,ward.ilike.%${safe}%,district.ilike.%${safe}%`);
    }
    return query;
  };

  // KHÔNG dùng select("*"): cột embedding vector(768) nặng ~15KB/dòng, 200 dòng = ~3MB vô ích (xem lib/cols)
  let query = applyFilters(supabase.from("listings").select(LISTING_CARD_COLS).eq("status", "published"));
  // 28/9: sắp xếp MẶC ĐỊNH thì rổ hàng Radar truy vấn riêng, trộn 2:1 với tin còn lại (lib/ro-hang).
  // Người dùng chủ động chọn sắp xếp theo giá/diện tích... thì tôn trọng thứ tự đó, không trộn.
  const tronMacDinh = !sort || !["price_asc", "price_desc", "ppm2_asc", "ppm2_desc", "area_asc", "area_desc", "score"].includes(sort);

  // "N tin mới hôm nay" (kiểu Homigo): tin Radar thấy lần đầu từ 0h hôm nay theo giờ VN, cùng bộ lọc
  const newTodayQuery = applyFilters(
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "published"),
  ).gte("first_seen_at", startOfDayVN());

  if (sort === "price_asc") query = query.order("price_vnd", { ascending: true, nullsFirst: false });
  else if (sort === "price_desc") query = query.order("price_vnd", { ascending: false, nullsFirst: false });
  else if (sort === "ppm2_asc") query = query.order("price_per_m2", { ascending: true, nullsFirst: false });
  else if (sort === "ppm2_desc") query = query.order("price_per_m2", { ascending: false, nullsFirst: false });
  else if (sort === "area_asc") query = query.order("area_m2", { ascending: true, nullsFirst: false });
  else if (sort === "area_desc") query = query.order("area_m2", { ascending: false, nullsFirst: false });
  else if (sort === "score") query = query.order("ai_score", { ascending: false, nullsFirst: false });
  else query = query.order("first_seen_at", { ascending: false, nullsFirst: false }); // mặc định: crawl mới nhất trước

  // tổng THẬT theo bộ lọc (UX audit: "200+" là cap của limit, người dùng không biết có 250 hay 5.000 tin)
  const totalQuery = applyFilters(supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "published"));
  // cây Tỉnh -> Quận -> Phường: dùng bản cache 10' (lib/geo) thay vì select 2.000 dòng mỗi request
  const [{ data }, { count: newToday }, { count: totalCount }, { data: rhData }] = await Promise.all([
    tronMacDinh ? query.neq("source", "ro_hang").limit(150) : query.limit(200),
    newTodayQuery,
    totalQuery,
    tronMacDinh
      ? applyFilters(supabase.from("listings").select(LISTING_CARD_COLS).eq("status", "published")).eq("source", "ro_hang")
          .order("first_seen_at", { ascending: false, nullsFirst: false }).limit(100)
      : Promise.resolve({ data: [] as Listing[] }),
  ]);
  // làm gọn cho trang danh sách: mô tả 220 ký tự, tối đa 4 ảnh (lib/img) - trang từng nặng 589 KB
  const listings = tronRoHang((rhData ?? []) as Listing[], (data ?? []) as Listing[]).slice(0, 200).map(cheTinDocQuyen).map(gonChoDanhSach).map(chiTruongThe);
  return { listings, newToday: newToday ?? 0, total: totalCount ?? listings.length };
  },
  ["search-v2"],   // v2: chỉ trường thẻ + mô tả 160 ký tự (30/9)
  { revalidate: 300, tags: ["listings"] },
);

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { kind, province, district, priceMin, priceMax } = sp;
  const deal = sp.deal === "ban" || sp.deal === "cho_thue" ? sp.deal : priceMin || priceMax ? "ban" : undefined;
  // khoá cache chỉ gồm tham số lọc (bỏ utm/fbclid... để không mỗi link quảng cáo là một bản cache riêng)
  const loc = Object.fromEntries(KHOA_LOC.filter((k) => sp[k]).map((k) => [k, sp[k]!.slice(0, 120)]));
  // cây Tỉnh -> Quận -> Phường: dùng bản cache 10' (lib/geo) thay vì select 2.000 dòng mỗi request
  const [{ listings, newToday, total: totalCount }, areas] = await Promise.all([timKiemCoCache(loc), getAreas()]);
  const geo = areas.geo;

  // ĐIỀU HƯỚNG KHU VỰC (29/9, kiểu Mogi "Quận 1 (1.629)"): tính sẵn ở server từ bảng đếm đã cache
  // (getAreas, 10') - không tốn truy vấn thêm, và chỉ gửi xuống client phần của 1 tỉnh thay vì cả bảng.
  // Đếm theo deal + loại + khu vực; CHƯA trừ giá/DT (nói rõ ở tooltip phía client).
  const demDeal = (c: { ban: number; cho_thue: number } | undefined) =>
    !c ? 0 : deal === "ban" ? c.ban : deal === "cho_thue" ? c.cho_thue : c.ban + c.cho_thue;
  const tinhs = Object.keys(areas.counts);
  const tinhDH = (province && (tinhs.find((p) => p === province) || tinhs.find((p) => p.toLowerCase().includes(province.toLowerCase()))))
    || [...tinhs].sort((a, b) => demDeal(areas.counts[b]) - demDeal(areas.counts[a]))[0];
  const nutTinh = tinhDH ? areas.counts[tinhDH] : undefined;
  const nutLoai = district && nutTinh?.districts[canonDistrict(district)] ? nutTinh.districts[canonDistrict(district)] : nutTinh;
  const dieuHuong: DieuHuong | null = nutTinh && tinhDH ? {
    province: tinhDH,
    kinds: Object.entries(nutLoai?.kinds || {}).map(([k, c]) => [k, demDeal(c)] as [string, number]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]),
    districts: Object.entries(nutTinh.districts)
      .map(([d, c]) => [d, kind ? demDeal(c.kinds[kind]) : demDeal(c)] as [string, number])
      .filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]),
  } : null;

  // key theo query: đổi URL (Back/Forward, breadcrumb, chip) là remount -> state luôn khớp URL
  return <SearchClient key={JSON.stringify(sp)} listings={listings} geo={geo} params={{ ...sp, deal }} newToday={newToday} total={totalCount} dieuHuong={dieuHuong} />;
}
