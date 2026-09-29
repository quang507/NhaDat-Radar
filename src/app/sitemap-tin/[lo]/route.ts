// Sitemap tin theo lô: /sitemap-tin/0.xml, /sitemap-tin/1.xml... (5.000 URL mỗi lô).
import { loTin, xmlSitemap, xmlResponse, SITE } from "@/lib/sitemap";

export const revalidate = 3600;

export async function GET(_req: Request, { params }: { params: Promise<{ lo: string }> }) {
  const { lo } = await params;
  const n = Number(String(lo).replace(/\.xml$/, ""));
  if (!Number.isInteger(n) || n < 0 || n > 99) return new Response("Not found", { status: 404 });
  const rows = await loTin(n);
  if (!rows.length && n > 0) return new Response("Not found", { status: 404 });   // lô ngoài phạm vi
  return xmlResponse(xmlSitemap(rows.map((r) => ({ url: `${SITE}/listings/${r.id}`, lastmod: r.created_at, priority: 0.6 }))));
}
