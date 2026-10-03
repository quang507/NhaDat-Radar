// Sitemap tin theo lô: /sitemap-tin/0.xml, /sitemap-tin/1.xml... (5.000 URL mỗi lô).
import { loTin, xmlSitemap, xmlResponse, SITE, loiTamThoi } from "@/lib/sitemap";

export const dynamic = "force-dynamic";   // 3/10: cache CDN 1 giờ (xmlResponse); DB lỗi -> 503 không cache

export async function GET(_req: Request, { params }: { params: Promise<{ lo: string }> }) {
  const { lo } = await params;
  const n = Number(String(lo).replace(/\.xml$/, ""));
  if (!Number.isInteger(n) || n < 0 || n > 99) return new Response("Not found", { status: 404 });
  let rows: Awaited<ReturnType<typeof loTin>>;
  try { rows = await loTin(n); } catch (e) { console.error(String(e)); return loiTamThoi(); }
  if (!rows.length && n > 0) return new Response("Not found", { status: 404 });   // lô ngoài phạm vi
  return xmlResponse(xmlSitemap(rows.map((r) => ({ url: `${SITE}/listings/${r.id}`, lastmod: r.created_at, priority: 0.6 }))));
}
