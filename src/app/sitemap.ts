import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://nha-dat-radar-rkyn.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const stat: MetadataRoute.Sitemap = [
    "", "/search", "/projects", "/agents", "/thong-ke", "/dinh-gia", "/tinh-lai-vay",
    "/thue-hay-mua", "/ban", "/huong-dan/mua", "/huong-dan/ban",
  ].map((p) => ({ url: SITE + p, changeFrequency: "daily" as const, priority: p === "" ? 1 : 0.7 }));

  try {
    const sb = createAdminClient();
    const [{ data: ls }, { data: ps }] = await Promise.all([
      sb.from("listings").select("id,created_at").eq("status", "published").order("first_seen_at", { ascending: false }).limit(1000),
      sb.from("projects").select("id").eq("status", "published").limit(200),
    ]);
    return [
      ...stat,
      ...(ls ?? []).map((l) => ({ url: `${SITE}/listings/${l.id}`, lastModified: l.created_at, priority: 0.6 })),
      ...(ps ?? []).map((p) => ({ url: `${SITE}/projects/${p.id}`, priority: 0.5 })),
    ];
  } catch {
    return stat;
  }
}
