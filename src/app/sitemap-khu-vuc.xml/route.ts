// Sitemap khu vực: trang tĩnh + trang tỉnh/quận/loại BĐS + dự án. Đây là nhóm URL ỔN ĐỊNH (không
// chết sau vài tuần như trang tin) nên là tài sản SEO chính.
import { createAnonClient } from "@/lib/supabase/anon";
import { areaPath, KIND_SLUG } from "@/lib/slug";
import { getAreas } from "@/lib/geo";
import { SITE, xmlSitemap, xmlResponse, type MucSitemap } from "@/lib/sitemap";

export const revalidate = 3600;

export async function GET() {
  const muc: MucSitemap[] = [
    "", "/search", "/projects", "/agents", "/thong-ke", "/dinh-gia", "/tinh-lai-vay",
    "/thue-hay-mua", "/ban", "/huong-dan/mua", "/huong-dan/ban", "/nha-dat-ban", "/nha-dat-cho-thue",
  ].map((p) => ({ url: SITE + p, changefreq: "daily", priority: p === "" ? 1 : 0.7 }));

  try {
    const { counts } = await getAreas();
    for (const [p, c] of Object.entries(counts)) {
      for (const deal of ["ban", "cho_thue"] as const) {
        if (c[deal] > 0) muc.push({ url: SITE + areaPath(deal, p), changefreq: "daily", priority: 0.8 });
        for (const [k, kc] of Object.entries(c.kinds || {})) {
          if (KIND_SLUG[k] && kc[deal] >= 10) muc.push({ url: SITE + areaPath(deal, p, null, k), changefreq: "daily", priority: 0.75 });
        }
        for (const [d, dc] of Object.entries(c.districts)) {
          if (dc[deal] >= 3) muc.push({ url: SITE + areaPath(deal, p, d), changefreq: "daily", priority: 0.7 });
          for (const [k, kc] of Object.entries(dc.kinds || {})) {
            if (KIND_SLUG[k] && kc[deal] >= 5) muc.push({ url: SITE + areaPath(deal, p, d, k), changefreq: "daily", priority: 0.65 });
          }
        }
      }
    }
    const { data: ps } = await createAnonClient().from("projects").select("id").eq("status", "published").limit(1000);
    for (const p of ps ?? []) muc.push({ url: `${SITE}/projects/${p.id}`, priority: 0.5 });
  } catch { /* DB lỗi -> ít nhất vẫn có trang tĩnh */ }

  return xmlResponse(xmlSitemap(muc));
}
