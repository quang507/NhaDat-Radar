// Sitemap tin: hỗ trợ theo tháng (2026-11.xml) và fallback theo lô số cũ (0.xml, 1.xml)
import { tinTheoThang, loTin, xmlSitemap, xmlResponse, SITE, loiTamThoi } from "@/lib/sitemap";

// Cache CDN 24 giờ - Googlebot cào không tốn Egress Supabase
export const revalidate = 86400;

export async function GET(_req: Request, { params }: { params: Promise<{ lo: string }> }) {
  const raw = (await params).lo.replace(/\.xml$/, "");

  // 1. Định dạng chuẩn mới: theo tháng YYYY-MM
  if (/^20\d\d-(0[1-9]|1[0-2])$/.test(raw)) {
    let rows: Awaited<ReturnType<typeof tinTheoThang>>;
    try {
      rows = await tinTheoThang(raw);
    } catch (e) {
      console.error(String(e));
      return loiTamThoi();
    }
    if (!rows.length) return new Response("Not found", { status: 404 });
    return xmlResponse(
      xmlSitemap(
        rows.map((r) => ({
          url: `${SITE}/listings/${r.id}`,
          lastmod: r.updated_at || r.created_at,
          priority: 0.6,
        }))
      )
    );
  }

  // 2. Fallback cho lô số cũ (0, 1, 2...) để bot cũ không gặp lỗi 404
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 0 || n > 99) return new Response("Not found", { status: 404 });
  let oldRows: Awaited<ReturnType<typeof loTin>>;
  try {
    oldRows = await loTin(n);
  } catch (e) {
    console.error(String(e));
    return loiTamThoi();
  }
  if (!oldRows.length && n > 0) return new Response("Not found", { status: 404 });
  return xmlResponse(
    xmlSitemap(
      oldRows.map((r) => ({
        url: `${SITE}/listings/${r.id}`,
        lastmod: r.created_at,
        priority: 0.6,
      }))
    )
  );
}
