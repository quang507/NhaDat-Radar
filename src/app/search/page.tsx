export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import type { Listing } from "@/lib/types";
import SearchClient, { type GeoTree } from "./SearchClient";

// Chuẩn hoá tên quận: bỏ đuôi "(P. X mới)" mà vài nguồn crawl gắn kèm sau sáp nhập.
const canonDistrict = (s: string) => s.replace(/\s*\([^)]*\)\s*$/, "").trim();

export const metadata = { title: "Tìm kiếm bất động sản - NhaDat Radar" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { deal, kind, province, district, ward, priceMin, priceMax, areaMin, bedrooms, q, sort, own, legal, direction } = sp;
  const supabase = await createClient();

  // Bộ lọc dùng chung cho danh sách + đếm "tin mới hôm nay" (cùng điều kiện)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyFilters = <T extends { eq: any; ilike: any; gte: any; lte: any; or: any }>(query: T): T => {
    if (deal === "ban" || deal === "cho_thue") query = query.eq("deal", deal);
    if (own === "1") query = query.eq("source", "agent"); // chỉ tin chính chủ tự đăng trên sàn
    if (kind) query = query.eq("kind", kind);
    if (province) query = query.ilike("province", `%${province}%`);
    // prefix-match rồi lọc chính xác phía dưới (tránh "Quận 1" khớp nhầm "Quận 10/11/12")
    if (district) query = query.ilike("district", `${district}%`);
    if (ward) query = query.ilike("ward", `%${ward}%`);
    if (priceMin && !Number.isNaN(Number(priceMin))) query = query.gte("price_vnd", Number(priceMin));
    if (priceMax && !Number.isNaN(Number(priceMax))) query = query.lte("price_vnd", Number(priceMax));
    if (areaMin && !Number.isNaN(Number(areaMin))) query = query.gte("area_m2", Number(areaMin));
    if (bedrooms && !Number.isNaN(Number(bedrooms))) query = query.gte("bedrooms", Number(bedrooms));
    // bộ lọc nâng cao (NN/g #7): pháp lý & hướng — khớp chuỗi mềm vì nguồn ghi tự do ("Sổ hồng riêng", "Đông Nam", "dong-nam")
    if (legal) query = query.ilike("legal_status", `%${legal.replace(/[%,()]/g, " ")}%`);
    if (direction) query = query.ilike("direction", `%${direction.replace(/[%,()]/g, " ").split(" ")[0]}%`);
    if (q) {
      // Học flow batdongsan: từ khoá khớp cả tiêu đề + địa chỉ/đường + phường + quận
      const safe = q.replace(/[,()%]/g, " ").trim();
      if (safe) query = query.or(`title.ilike.%${safe}%,address.ilike.%${safe}%,ward.ilike.%${safe}%,district.ilike.%${safe}%`);
    }
    return query;
  };

  let query = applyFilters(supabase.from("listings").select("*").eq("status", "published"));

  // "N tin mới hôm nay" (kiểu Homigo): tin Radar thấy lần đầu từ 0h hôm nay theo giờ VN, cùng bộ lọc
  const startOfDayVN = (() => { const d = new Date(Date.now() + 7 * 3600 * 1000); d.setUTCHours(0, 0, 0, 0); return new Date(d.getTime() - 7 * 3600 * 1000).toISOString(); })();
  const newTodayQuery = applyFilters(
    supabase.from("listings").select("id", { count: "exact", head: true }).eq("status", "published"),
  ).gte("first_seen_at", startOfDayVN);

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
  const [{ data }, { data: geoRows }, { count: newToday }, { count: totalCount }] = await Promise.all([
    query.limit(200),
    supabase.from("listings").select("province,district,ward").eq("status", "published").limit(2000),
    newTodayQuery,
    totalQuery,
  ]);
  let listings = (data ?? []) as Listing[];
  if (district) listings = listings.filter((x) => canonDistrict(x.district || "").toLowerCase() === district.toLowerCase());

  // Dựng cây Tỉnh -> Quận -> Phường từ dữ liệu thật để đổ vào select phụ thuộc
  const geo: GeoTree = {};
  for (const r of geoRows ?? []) {
    const p = (r.province || "").trim();
    if (!p) continue;
    geo[p] ??= {};
    const raw = (r.district || "").trim();
    if (!raw) continue;
    const d = canonDistrict(raw); // "Quận 9 (P. Long Bình mới)" -> "Quận 9"
    if (!d) continue;
    geo[p][d] ??= [];
    // ward: ưu tiên cột ward; thiếu thì tách từ đuôi "(P. X mới)" của quận
    let w = (r.ward || "").trim();
    if (!w) {
      const m = raw.match(/\(\s*(?:P\.|Phường)?\s*([^)]*?)\s*(?:mới)?\s*\)\s*$/i);
      if (m && m[1]) w = "Phường " + m[1].replace(/^(P\.|Phường)\s*/i, "");
    }
    if (w && !geo[p][d].includes(w)) geo[p][d].push(w);
  }
  for (const p of Object.keys(geo)) for (const d of Object.keys(geo[p])) geo[p][d].sort();

  // key theo query: đổi URL (Back/Forward, breadcrumb, chip) là remount -> state luôn khớp URL
  return <SearchClient key={JSON.stringify(sp)} listings={listings} geo={geo} params={sp} newToday={newToday ?? 0} total={district ? listings.length : (totalCount ?? listings.length)} />;
}
