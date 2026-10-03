export const dynamic = "force-dynamic";

import { createAnonClient } from "@/lib/supabase/anon";   // KHÔNG cookie -> cache được (30/9)
import { unstable_cache } from "next/cache";
import { gonChoDanhSach } from "@/lib/img";
import type { Listing } from "@/lib/types";
import { canonDistrict, startOfDayVN } from "@/lib/format";
import { getAreas } from "@/lib/geo";
import { LISTING_SEARCH_COLS } from "@/lib/cols";
import { tinhCuGopVao } from "@/lib/sap-nhap";
import SearchClient, { type DieuHuong } from "./SearchClient";
import { cheTinDocQuyen } from "@/lib/doc-quyen";
import { oTronRoHang, xepTheoThuTu } from "@/lib/ro-hang";
import { docTienIch, dieuKienTienIch, tienIchCua } from "@/lib/tien-ich";

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
  "so_anh", "co_video", "ti", "ai_score", "price_flag", "first_seen_at"] as const;
const chiTruongThe = (x: Listing) =>
  Object.fromEntries(TRUONG_THE.filter((k) => x[k as keyof Listing] != null).map((k) => [k, x[k as keyof Listing]])) as unknown as Listing;

/** ?gan=lat,lng&bk=km -> tâm + nửa cạnh khung (độ); null nếu sai định dạng. Bán kính 0,5-20 km, mặc định 2 km */
function toaDoGan(gan?: string, bk?: string) {
  const m = String(gan || "").match(/^(-?\d{1,2}(?:\.\d+)?),(-?\d{1,3}(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1]), lng = Number(m[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  const km = Math.min(20, Math.max(0.5, Number(bk) || 2));
  return { lat, lng, km, dLat: km / 111.32, dLng: km / (111.32 * Math.cos((lat * Math.PI) / 180)) };
}
function kmGiua(a: { lat: number; lng: number }, lat: number, lng: number) {
  const r = Math.PI / 180, dLat = (lat - a.lat) * r, dLng = (lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(lat * r) * Math.sin(dLng / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

// danh sách dự án cho ô "Chọn dự án..." (đổi rất ít -> cache 1 giờ)
const layDuAn = unstable_cache(
  async () => {
    const { data } = await createAnonClient().from("projects").select("id,name").eq("status", "published").order("name").limit(500);
    return (data ?? []) as { id: string; name: string }[];
  },
  ["search-du-an"],
  { revalidate: 3600 },
);

/** "nha,can_ho" -> ["nha","can_ho"]; chỉ nhận mã loại hợp lệ, tối đa 6 */
const dsLoai = (kind?: string) => String(kind || "").split(",").map((k) => k.trim()).filter((k) => /^[a-z_]{2,20}$/.test(k)).slice(0, 6);

// PHÂN TRANG THẬT (1/10): mỗi trang tải đúng 20 tin bằng .range() thay vì kéo 200 tin mới nhất rồi lật
// trang ở trình duyệt - trước đó khách chỉ xem được 200/3.860 tin mua bán, HTML trang ~350-450 KB.
const MOI_TRANG = 20;
const TRANG_TOI_DA = 500;
const soTrang = (p?: string) => Math.min(TRANG_TOI_DA, Math.max(1, parseInt(p || "1", 10) || 1));

const khongDau = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().replace(/^(thanh pho|tp\.?|tinh)\s+/, "").trim();

const KHOA_LOC = ["page", "deal", "kind", "province", "district", "ward", "priceMin", "priceMax", "areaMin", "areaMax", "bedrooms", "bathrooms", "ti", "project", "street", "anh", "gan", "bk", "q", "sort", "own", "legal", "direction", "newAddr", "agent"] as const;
const timKiemCoCache = unstable_cache(
  async (sp: Record<string, string | undefined>) => {
  const { kind, province, district, ward, priceMin, priceMax, areaMin, areaMax, bedrooms, bathrooms, ti, project, street, anh, q, sort, own, legal, direction, newAddr, agent } = sp;
  const tam = toaDoGan(sp.gan, sp.bk);
  // URL có lọc giá mà không có deal (dán tay / link cũ): hiểu theo thang tỷ như UI đang hiện
  // (SearchClient.push cũng ép vậy) - không thì mọi tin thuê đều lọt lưới "dưới X tỷ".
  const deal = sp.deal === "ban" || sp.deal === "cho_thue" ? sp.deal : priceMin || priceMax ? "ban" : undefined;
  const supabase = createAnonClient();

  // Làm sạch input trước khi đưa vào ilike/or của PostgREST: %/_ là wildcard, ",()" phá cú pháp .or() (audit 16/8: province/district/ward từng đưa thẳng)
  const clean = (s: string) => s.replace(/[%_*,()]/g, " ").replace(/\s+/g, " ").trim();
  // 3/10: lọc tỉnh bằng .in(tên tỉnh CÓ THẬT trong DB) thay cho ilike "%...%" (quét cả bảng, đếm HEAD từng mất 4s/500).
  // Tên tỉnh lấy từ cây khu vực đã cache; gộp biến thể nguồn ghi ("Thành phố Hồ Chí Minh", "TP.HCM").
  const tenTinh = Object.keys((await getAreas()).counts);
  const khopTinh = (p: string): string[] => {
    const k = khongDau(p);
    if (!k) return [];
    const bd = k === "ho chi minh" || k === "tp.hcm" || k === "hcm" ? ["ho chi minh", "tp.hcm", "tphcm"] : [k];
    return tenTinh.filter((t) => { const n = khongDau(t); return bd.some((b) => n.includes(b)); });
  };
  // Bộ lọc dùng chung cho danh sách + đếm (cùng điều kiện)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyFilters = <T extends { eq: any; neq: any; ilike: any; gte: any; lte: any; or: any; in: any }>(query: T): T => {
    if (deal === "ban" || deal === "cho_thue") query = query.eq("deal", deal);
    if (own === "1") query = query.eq("source", "agent"); // chỉ tin chính chủ tự đăng trên sàn
    // ?agent=<uuid> từ nút "Xem tin đăng" trang /agents - trước đây link đó truyền ?q=<tên
    // người bán> mà q chỉ tìm trong tiêu đề/địa chỉ nên luôn 0 kết quả
    if (agent && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(agent)) query = query.eq("agent_id", agent);
    // kind có thể là danh sách "nha,can_ho" (bộ lọc mua bán tick nhiều loại, 1/10)
    const kinds = dsLoai(kind);
    if (kinds.length === 1) query = query.eq("kind", kinds[0]);
    else if (kinds.length > 1) query = query.in("kind", kinds);
    // Công tắc "Địa chỉ mới sau sáp nhập" BẬT -> lọc theo địa giới 2025: chọn "Hồ Chí Minh"
    // thì trả về CẢ tin còn ghi "Bình Dương" / "Bà Rịa - Vũng Tàu", vì nguồn vẫn dùng tên tỉnh cũ.
    // TẮT (mặc định) -> đúng tên tỉnh như nguồn ghi, giữ thói quen tìm của thị trường.
    if (province) {
      const cu = newAddr === "1" ? tinhCuGopVao(province) : [];
      const ds = [...new Set([province, ...cu].flatMap(khopTinh))];
      if (ds.length) query = query.in("province", ds);
      else if (cu.length) query = query.or([province, ...cu].map((p) => `province.ilike.%${clean(p)}%`).join(","));
      else query = query.ilike("province", `%${clean(province)}%`);
    }
    // district trong DB đã chuẩn hoá (merge.mjs canonDistrict + UPDATE 16/8) -> so KHỚP CHÍNH XÁC, không còn prefix + post-filter
    if (district) query = query.eq("district", canonDistrict(district));
    if (ward) query = query.ilike("ward", `%${clean(ward)}%`);
    if (priceMin && !Number.isNaN(Number(priceMin))) query = query.gte("price_vnd", Number(priceMin));
    if (priceMax && !Number.isNaN(Number(priceMax))) query = query.lte("price_vnd", Number(priceMax));
    if (areaMin && !Number.isNaN(Number(areaMin))) query = query.gte("area_m2", Number(areaMin));
    if (areaMax && !Number.isNaN(Number(areaMax))) query = query.lte("area_m2", Number(areaMax));
    if (bedrooms && !Number.isNaN(Number(bedrooms))) query = query.gte("bedrooms", Number(bedrooms));
    if (bathrooms && !Number.isNaN(Number(bathrooms))) query = query.gte("bathrooms", Number(bathrooms));
    // 1/10 bộ lọc kiểu EvoHome: tiện ích (mỗi cái 1 nhóm OR, các nhóm AND với nhau - lib/tien-ich),
    // dự án, tên đường, có/không ảnh, bán kính quanh 1 điểm (link Google Maps)
    for (const t of docTienIch(ti)) query = query.or(dieuKienTienIch(t));
    if (project && /^[0-9a-f-]{36}$/i.test(project)) query = query.eq("project_id", project);
    if (street && clean(street)) query = query.ilike("address", `%${clean(street)}%`);
    if (anh === "co") query = query.neq("images", "{}");
    else if (anh === "khong") query = query.eq("images", "{}");
    if (tam) query = query.gte("lat", tam.lat - tam.dLat).lte("lat", tam.lat + tam.dLat).gte("lng", tam.lng - tam.dLng).lte("lng", tam.lng + tam.dLng);
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
  let query = applyFilters(supabase.from("listings").select(LISTING_SEARCH_COLS).eq("status", "published"));
  // 28/9: sắp xếp MẶC ĐỊNH thì rổ hàng Radar truy vấn riêng, trộn 2:1 với tin còn lại (lib/ro-hang).
  // Người dùng chủ động chọn sắp xếp theo giá/diện tích... thì tôn trọng thứ tự đó, không trộn.
  const tronMacDinh = !tam && (!sort || !["price_asc", "price_desc", "ppm2_asc", "ppm2_desc", "area_asc", "area_desc", "score"].includes(sort));

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
  // khoá phụ theo id: rổ hàng nhập theo lô trùng first_seen_at -> không có khoá phụ thì Postgres trả thứ tự
  // tuỳ ý mỗi lần, .range() trang 2 lặp lại tin của trang 1 (đo 1/10: 13/20 tin trùng)
  query = query.order("id", { ascending: true });

  // tổng THẬT theo bộ lọc (UX audit: "200+" là cap của limit, người dùng không biết có 250 hay 5.000 tin)
  const totalQuery = applyFilters(supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "published"));
  const trang = soTrang(sp.page);
  const tu = (trang - 1) * MOI_TRANG;
  // tiện ích (ti) tính trên mô tả đầy đủ TRƯỚC khi gonChoDanhSach cắt - thẻ phòng cho thuê hiện icon tiện ích
  const gon = (ds: Listing[]) => ds.map((x) => (x.deal === "cho_thue" ? { ...x, ti: tienIchCua(x) } : x)).map(cheTinDocQuyen).map(gonChoDanhSach).map(chiTruongThe);

  // Lọc theo khoảng cách: DB chỉ lọc được khung vuông -> vẫn tải tối đa 200 tin trong khung, cắt đúng
  // bán kính + xếp gần trước ở đây, rồi mới chia trang (tổng = số tin thật sự trong bán kính).
  if (tam) {
    const [{ data }, { count: newToday }] = await Promise.all([query.limit(200), newTodayQuery]);
    const gop = ((data ?? []) as Listing[]).filter((x) => x.lat != null && x.lng != null && kmGiua(tam, x.lat!, x.lng!) <= tam.km);
    if (!sort) gop.sort((a, b) => kmGiua(tam, a.lat!, a.lng!) - kmGiua(tam, b.lat!, b.lng!));
    return { listings: gon(gop.slice(tu, tu + MOI_TRANG)), newToday: newToday ?? 0, total: gop.length, trang };
  }

  // Sắp xếp chủ động (giá, diện tích, điểm...): lấy thẳng đoạn của trang
  if (!tronMacDinh) {
    const [{ data }, { count: newToday }, { count: total }] = await Promise.all([query.range(tu, tu + MOI_TRANG - 1), newTodayQuery, totalQuery]);
    return { listings: gon((data ?? []) as Listing[]), newToday: newToday ?? 0, total: total ?? 0, trang };
  }

  // Mặc định: trộn rổ hàng 2:1 (lib/ro-hang). Đếm 2 bên trước -> biết trang này cần đoạn nào của mỗi bên
  // (oTronRoHang) -> tải đúng 2 đoạn đó, nhịp trộn liền mạch qua các trang.
  const [{ count: newToday }, { count: total }, { count: soRh }] = await Promise.all([
    newTodayQuery, totalQuery,
    applyFilters(supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "published")).eq("source", "ro_hang"),
  ]);
  const R = soRh ?? 0, K = Math.max(0, (total ?? 0) - R);
  const o = oTronRoHang(R, K, tu, MOI_TRANG);
  const [{ data: khac }, { data: rh }] = await Promise.all([
    o.khacSo ? query.neq("source", "ro_hang").range(o.khacTu, o.khacTu + o.khacSo - 1) : Promise.resolve({ data: [] as Listing[] }),
    o.rhSo
      ? applyFilters(supabase.from("listings").select(LISTING_SEARCH_COLS).eq("status", "published")).eq("source", "ro_hang")
          .order("first_seen_at", { ascending: false, nullsFirst: false }).order("id", { ascending: true }).range(o.rhTu, o.rhTu + o.rhSo - 1)
      : Promise.resolve({ data: [] as Listing[] }),
  ]);
  const listings = gon(xepTheoThuTu(o.thuTu, (rh ?? []) as Listing[], (khac ?? []) as Listing[]));
  return { listings, newToday: newToday ?? 0, total: total ?? listings.length, trang };
  },
  ["search-v8"],   // v2: chỉ trường thẻ + mô tả 160 ký tự (30/9); v6: phân trang thật 20 tin/trang + khoá phụ id + tiện ích thẻ thuê (1/10); v7: cắt mô tả không chẻ emoji (2/10)
  { revalidate: 900, tags: ["listings"] },   // 15 phút (2/10, egress)
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
  const [{ listings, newToday, total: totalCount, trang }, areas, duAn] = await Promise.all([timKiemCoCache(loc), getAreas(), layDuAn()]);
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
      .map(([d, c]) => [d, kind ? dsLoai(kind).reduce((n, k) => n + demDeal(c.kinds[k]), 0) : demDeal(c)] as [string, number])
      .filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]),
  } : null;

  // key theo query: đổi URL (Back/Forward, breadcrumb, chip) là remount -> state luôn khớp URL
  return <SearchClient key={JSON.stringify(sp)} listings={listings} geo={geo} params={{ ...sp, deal }} newToday={newToday} total={totalCount} trang={trang} moiTrang={MOI_TRANG} dieuHuong={dieuHuong} duAn={duAn} />;
}
