// Sitemap riêng cho dự án đạt chuẩn nội dung (tách khỏi sitemap-khu-vuc.xml theo SEO Audit §3.2)
// Chỉ khai báo dự án có mô tả >= 200 ký tự hoặc >= NGUONG.duAn tin đang đăng -> đồng bộ 1:1 với robots meta.
import { createAnonClient } from "@/lib/supabase/anon";
import { SITE, xmlSitemap, xmlResponse, loiTamThoi, type MucSitemap } from "@/lib/sitemap";
import { NGUONG } from "@/lib/seo-index";

export const revalidate = 43200;

export async function GET() {
  try {
    const sb = createAnonClient();
    const [{ data: ps, error: e1 }, { data: ls, error: e2 }] = await Promise.all([
      sb.from("projects").select("id, description, created_at").eq("status", "published").order("id").limit(2000),
      sb.from("listings").select("project_id").eq("status", "published").not("project_id", "is", null).limit(5000),
    ]);
    if (e1 || e2) throw new Error(e1?.message || e2?.message || "query error");

    const dem = new Map<string, number>();
    for (const r of ls ?? []) {
      if (r.project_id) dem.set(r.project_id, (dem.get(r.project_id) || 0) + 1);
    }

    const muc: MucSitemap[] = [];
    for (const p of ps ?? []) {
      if ((p.description || "").trim().length >= 200 || (dem.get(p.id) || 0) >= NGUONG.duAn) {
        muc.push({ url: `${SITE}/projects/${p.id}`, lastmod: p.created_at, priority: 0.5 });
      }
    }
    return xmlResponse(xmlSitemap(muc));
  } catch (e) {
    console.error("sitemap-du-an:", String(e));
    return loiTamThoi();
  }
}
