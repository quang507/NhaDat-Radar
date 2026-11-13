// Hàm dựng XML cho sitemap index + các sitemap con (23/9, cập nhật 14/11 - Hướng B).
// Bỏ sitemap trang tin, chỉ giữ sitemap khu vực và dự án.
import { SITE_URL } from "@/lib/ld";

export const SITE = SITE_URL;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type MucSitemap = { url: string; lastmod?: string | null; changefreq?: string; priority?: number };

export function xmlSitemap(muc: MucSitemap[]): string {
  const body = muc.map((m) => [
    "<url>", `<loc>${esc(m.url)}</loc>`,
    m.lastmod ? `<lastmod>${esc(new Date(m.lastmod).toISOString())}</lastmod>` : "",
    m.changefreq ? `<changefreq>${m.changefreq}</changefreq>` : "",
    m.priority != null ? `<priority>${m.priority}</priority>` : "",
    "</url>",
  ].join("")).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</urlset>`;
}

export function xmlSitemapIndex(urls: string[]): string {
  const body = urls.map((u) => `<sitemap><loc>${esc(u)}</loc></sitemap>`).join("");
  return `<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${body}</sitemapindex>`;
}

export const xmlResponse = (xml: string) =>
  new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=0, s-maxage=3600" } });

/** DB lỗi tạm thời -> 503 KHÔNG cache (Google tự thử lại), thay vì cache 1 giờ một sitemap rỗng/thiếu */
export const loiTamThoi = () => new Response("Tạm thời không lấy được dữ liệu", { status: 503, headers: { "Retry-After": "600", "Cache-Control": "no-store" } });
