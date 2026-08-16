import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { areaPath } from "@/lib/slug";

export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://nha-dat-radar-rkyn.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const stat: MetadataRoute.Sitemap = [
    "", "/search", "/projects", "/agents", "/thong-ke", "/dinh-gia", "/tinh-lai-vay",
    "/thue-hay-mua", "/ban", "/huong-dan/mua", "/huong-dan/ban",
  ].map((p) => ({ url: SITE + p, changeFrequency: "daily" as const, priority: p === "" ? 1 : 0.7 }));

  try {
    const sb = createAdminClient();
    const [{ data: ls }, { data: ps }, { data: areas }] = await Promise.all([
      sb.from("listings").select("id,created_at").eq("status", "published").order("first_seen_at", { ascending: false }).limit(1000),
      sb.from("projects").select("id").eq("status", "published").limit(200),
      sb.from("listings").select("province,district,deal").eq("status", "published").limit(5000),
    ]);
    // Trang SEO khu vực: /nha-dat-ban/[tinh](/[quan]) — chỉ sinh cho khu vực đang có tin (≥3 tin cho cấp quận)
    const areaUrls = new Map<string, number>();
    for (const r of areas ?? []) {
      const p = (r.province || "").trim(); if (!p) continue;
      const deal = r.deal as "ban" | "cho_thue";
      areaUrls.set(areaPath(deal, p), (areaUrls.get(areaPath(deal, p)) || 0) + 1);
      const d = (r.district || "").replace(/\s*\([^)]*\)\s*$/, "").trim();
      if (d) areaUrls.set(areaPath(deal, p, d), (areaUrls.get(areaPath(deal, p, d)) || 0) + 1);
    }
    const areaEntries = [...areaUrls.entries()].filter(([u, n]) => n >= 3 || u.split("/").length <= 3)
      .map(([u]) => ({ url: SITE + u, changeFrequency: "daily" as const, priority: u.split("/").length <= 3 ? 0.8 : 0.7 }));
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
