export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import type { Listing } from "@/lib/types";
import SearchClient, { type GeoTree } from "./SearchClient";

export const metadata = { title: "Tìm kiếm bất động sản - NhaDat Radar" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const { deal, kind, province, district, ward, priceMin, priceMax, areaMin, bedrooms, q, sort } = sp;
  const supabase = await createClient();

  let query = supabase.from("listings").select("*").eq("status", "published");
  if (deal === "ban" || deal === "cho_thue") query = query.eq("deal", deal);
  if (kind) query = query.eq("kind", kind);
  if (province) query = query.ilike("province", `%${province}%`);
  if (district) query = query.ilike("district", `%${district}%`);
  if (ward) query = query.ilike("ward", `%${ward}%`);
  if (priceMin && !Number.isNaN(Number(priceMin))) query = query.gte("price_vnd", Number(priceMin));
  if (priceMax && !Number.isNaN(Number(priceMax))) query = query.lte("price_vnd", Number(priceMax));
  if (areaMin && !Number.isNaN(Number(areaMin))) query = query.gte("area_m2", Number(areaMin));
  if (bedrooms && !Number.isNaN(Number(bedrooms))) query = query.gte("bedrooms", Number(bedrooms));
  if (q) query = query.ilike("title", `%${q}%`);

  if (sort === "price_asc") query = query.order("price_vnd", { ascending: true, nullsFirst: false });
  else if (sort === "price_desc") query = query.order("price_vnd", { ascending: false, nullsFirst: false });
  else if (sort === "area_desc") query = query.order("area_m2", { ascending: false, nullsFirst: false });
  else if (sort === "score") query = query.order("ai_score", { ascending: false, nullsFirst: false });
  else query = query.order("first_seen_at", { ascending: false, nullsFirst: false }); // mặc định: crawl mới nhất trước

  const [{ data }, { data: geoRows }] = await Promise.all([
    query.limit(200),
    supabase.from("listings").select("province,district,ward").eq("status", "published").limit(2000),
  ]);
  const listings = (data ?? []) as Listing[];

  // Dựng cây Tỉnh -> Quận -> Phường từ dữ liệu thật để đổ vào select phụ thuộc
  const geo: GeoTree = {};
  for (const r of geoRows ?? []) {
    const p = (r.province || "").trim();
    if (!p) continue;
    geo[p] ??= {};
    const d = (r.district || "").trim();
    if (!d) continue;
    geo[p][d] ??= [];
    const w = (r.ward || "").trim();
    if (w && !geo[p][d].includes(w)) geo[p][d].push(w);
  }
  for (const p of Object.keys(geo)) for (const d of Object.keys(geo[p])) geo[p][d].sort();

  return <SearchClient listings={listings} geo={geo} params={sp} />;
}
