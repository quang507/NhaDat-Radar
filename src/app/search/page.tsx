export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import type { Listing } from "@/lib/types";
import { canonDistrict, startOfDayVN } from "@/lib/format";
import { getAreas } from "@/lib/geo";
import SearchClient from "./SearchClient";

export const metadata = { title: "Tìm kiếm bất động sản - NhaDat Radar" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { deal, kind, province, district, ward, priceMin, priceMax, areaMin, bedrooms, q, sort, own, legal, direction } = sp;
  const supabase = await createClient();

  // Làm sạch input trước khi đưa vào ilike/or của PostgREST: %/_ là wildcard, ",()" phá cú pháp .or() (audit 16/8: province/district/ward từng đưa thẳng)
  const clean = (s: string) => s.replace(/[%_*,()]/g, " ").replace(/\s+/g, " ").trim();
  // Bộ lọc dùng chung cho danh sách + đếm (cùng điều kiện)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyFilters = <T extends { eq: any; ilike: any; gte: any; lte: any; or: any }>(query: T): T => {
    if (deal === "ban" || deal === "cho_thue") query = query.eq("deal", deal);
    if (own === "1") query = query.eq("source", "agent"); // chỉ tin chính chủ tự đăng trên sàn
    if (kind) query = query.eq("kind", kind);
    if (province) query = query.ilike("province", `%${clean(province)}%`);
    // district trong DB đã chuẩn hoá (merge.mjs canonDistrict + UPDATE 16/8) -> so KHỚP CHÍNH XÁC, không còn prefix + post-filter
    if (district) query = query.eq("district", canonDistrict(district));
    if (ward) query = query.ilike("ward", `%${clean(ward)}%`);
    if (priceMin && !Number.isNaN(Number(priceMin))) query = query.gte("price_vnd", Number(priceMin));
    if (priceMax && !Number.isNaN(Number(priceMax))) query = query.lte("price_vnd", Number(priceMax));
    if (areaMin && !Number.isNaN(Number(areaMin))) query = query.gte("area_m2", Number(areaMin));
    if (bedrooms && !Number.isNaN(Number(bedrooms))) query = query.gte("bedrooms", Number(bedrooms));
    // bộ lọc nâng cao (NN/g #7): pháp lý & hướng — khớp chuỗi mềm vì nguồn ghi tự do ("Sổ hồng riêng", "Đông Nam")
    if (legal) query = query.ilike("legal_status", `%${clean(legal)}%`);
    if (direction) query = query.ilike("direction", `%${clean(direction).split(" ")[0]}%`);
    if (q) {
      // Học flow batdongsan: từ khoá khớp cả tiêu đề + địa chỉ/đường + phường + quận
      const safe = clean(q);
      if (safe) query = query.or(`title.ilike.%${safe}%,address.ilike.%${safe}%,ward.ilike.%${safe}%,district.ilike.%${safe}%`);
    }
    return query;
  };

  let query = applyFilters(supabase.from("listings").select("*").eq("status", "published"));

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
  const [{ data }, areas, { count: newToday }, { count: totalCount }] = await Promise.all([
    query.limit(200),
    getAreas(),
    newTodayQuery,
    totalQuery,
  ]);
  const listings = (data ?? []) as Listing[];
  const geo = areas.geo;

  // key theo query: đổi URL (Back/Forward, breadcrumb, chip) là remount -> state luôn khớp URL
  return <SearchClient key={JSON.stringify(sp)} listings={listings} geo={geo} params={sp} newToday={newToday ?? 0} total={totalCount ?? listings.length} />;
}
