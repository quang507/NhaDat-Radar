// SERVER-ONLY: cây khu vực + đếm, cache 10 phút. (Helper thuần canonDistrict/shortPrice/fmtPpm2/startOfDayVN nằm ở lib/format.ts
// để client component dùng được.) Audit 16/8: home/search/khu vực/sitemap/đăng tin mỗi request tự select 2-5k dòng để dựng
// cùng một cây Tỉnh->Quận->Phường; AreaLanding còn gọi 2 lần (metadata + page).
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { canonDistrict } from "@/lib/format";

export type Deal = "ban" | "cho_thue";
export type AreaTree = {
  /** Tỉnh -> Quận -> [Phường] (select phụ thuộc + autosuggest) */
  geo: Record<string, Record<string, string[]>>;
  /** Số tin theo tỉnh/quận, tách bán/thuê (trang khu vực, sitemap, chip) */
  counts: Record<string, { ban: number; cho_thue: number; districts: Record<string, { ban: number; cho_thue: number }> }>;
  total: number;
  sources: number;
  districtCount: number;
};

export const getAreas = unstable_cache(
  async (): Promise<AreaTree> => {
    const sb = createAdminClient(); // chỉ đọc published, không phụ thuộc user -> cache chung an toàn
    const rows: { province: string | null; district: string | null; ward: string | null; deal: string; source: string; source_site: string | null }[] = [];
    for (let from = 0; ; from += 1000) {
      const { data } = await sb.from("listings").select("province,district,ward,deal,source,source_site").eq("status", "published").order("id").range(from, from + 999);
      rows.push(...(data ?? []));
      if (!data || data.length < 1000 || rows.length >= 20000) break;
    }
    const geo: AreaTree["geo"] = {};
    const counts: AreaTree["counts"] = {};
    const sources = new Set<string>();
    for (const r of rows) {
      sources.add(r.source === "crawl" ? (r.source_site || "crawl") : r.source);
      const p = (r.province || "").trim(); if (!p) continue;
      const deal = (r.deal === "cho_thue" ? "cho_thue" : "ban") as Deal;
      geo[p] ??= {}; counts[p] ??= { ban: 0, cho_thue: 0, districts: {} };
      counts[p][deal] += 1;
      const raw = (r.district || "").trim();
      const d = canonDistrict(raw);
      if (!d) continue;
      geo[p][d] ??= [];
      counts[p].districts[d] ??= { ban: 0, cho_thue: 0 };
      counts[p].districts[d][deal] += 1;
      let w = (r.ward || "").trim();
      if (!w) { const m = raw.match(/\(\s*(?:P\.|Phường)?\s*([^)]*?)\s*(?:mới)?\s*\)\s*$/i); if (m && m[1]) w = "Phường " + m[1].replace(/^(P\.|Phường)\s*/i, ""); }
      if (w && !geo[p][d].includes(w)) geo[p][d].push(w);
    }
    let districtCount = 0;
    for (const p of Object.keys(geo)) for (const d of Object.keys(geo[p])) { geo[p][d].sort(); districtCount++; }
    return { geo, counts, total: rows.length, sources: sources.size, districtCount };
  },
  ["areas-v1"],
  { revalidate: 600, tags: ["areas"] },
);
