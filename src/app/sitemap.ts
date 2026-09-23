import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { areaPath, KIND_SLUG } from "@/lib/slug";
import { getAreas } from "@/lib/geo";

// audit 16/8: bỏ force-dynamic (bot gọi sitemap liên tục -> mỗi lần 3 query); cache 1 giờ là đủ cho crawl 1 lần/ngày
export const revalidate = 3600;

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://nhadatradar.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const stat: MetadataRoute.Sitemap = [
    "", "/search", "/projects", "/agents", "/thong-ke", "/dinh-gia", "/tinh-lai-vay",
    "/thue-hay-mua", "/ban", "/huong-dan/mua", "/huong-dan/ban",
  ].map((p) => ({ url: SITE + p, changeFrequency: "daily" as const, priority: p === "" ? 1 : 0.7 }));

  try {
    const sb = createAdminClient();
    const [{ data: ls }, { data: ps }, { counts }] = await Promise.all([
      sb.from("listings").select("id,created_at").eq("status", "published").order("first_seen_at", { ascending: false }).limit(1000),
      sb.from("projects").select("id").eq("status", "published").limit(200),
      getAreas(), // cây khu vực dùng chung (cache 10') thay vì select 5.000 dòng riêng
    ]);
    // Trang SEO khu vực: /nha-dat-ban/[tinh](/[quan]) - chỉ sinh cho khu vực đang có tin (≥3 tin cho cấp quận)
    const areaEntries: MetadataRoute.Sitemap = [];
    for (const [p, c] of Object.entries(counts)) {
      for (const deal of ["ban", "cho_thue"] as const) {
        if (c[deal] > 0) areaEntries.push({ url: SITE + areaPath(deal, p), changeFrequency: "daily", priority: 0.8 });
        // trang theo LOẠI BĐS cấp tỉnh (>=10 tin mới đáng có URL riêng)
        for (const [k, kc] of Object.entries(c.kinds || {})) {
          if (KIND_SLUG[k] && kc[deal] >= 10) areaEntries.push({ url: SITE + areaPath(deal, p, null, k), changeFrequency: "daily", priority: 0.75 });
        }
        for (const [d, dc] of Object.entries(c.districts)) {
          if (dc[deal] >= 3) areaEntries.push({ url: SITE + areaPath(deal, p, d), changeFrequency: "daily", priority: 0.7 });
          // trang loại BĐS trong quận (>=5 tin) - nhóm URL ổn định, không chết như trang tin
          for (const [k, kc] of Object.entries(dc.kinds || {})) {
            if (KIND_SLUG[k] && kc[deal] >= 5) areaEntries.push({ url: SITE + areaPath(deal, p, d, k), changeFrequency: "daily", priority: 0.65 });
          }
        }
      }
    }
    return [
      ...stat,
      ...areaEntries,
      ...(ls ?? []).map((l) => ({ url: `${SITE}/listings/${l.id}`, lastModified: l.created_at, priority: 0.6 })),
      ...(ps ?? []).map((p) => ({ url: `${SITE}/projects/${p.id}`, priority: 0.5 })),
    ];
  } catch {
    return stat;
  }
}
