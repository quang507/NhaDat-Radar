// Hàm dựng XML cho sitemap index + các sitemap con (23/9).
// Trước đây app/sitemap.ts gom TẤT CẢ vào 1 file và cắt cứng ở limit(1000) -> chỉ 1.000/6.575 tin
// được khai báo, 85% trang tin Google không biết tới. Giờ tách: khu vực 1 file, tin chia lô 5.000.
import { createAnonClient } from "@/lib/supabase/anon";

export const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://nhadatradar.com";
export const MOI_LO = 5000;   // giới hạn chuẩn của sitemap là 50.000 URL / 50MB; 5.000 cho nhẹ

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

/** Số tin published (để biết cần bao nhiêu lô sitemap) */
export async function demTin(): Promise<number> {
  const { count, error } = await createAnonClient().from("listings").select("id", { count: "exact", head: true }).eq("status", "published");
  // 3/10: lỗi DB tạm thời từng bị coi là "0 tin" -> index chỉ khai 1 lô (Google mất ~17.000 tin). Ném lỗi để route trả 503.
  if (error || count == null) throw new Error("demTin: " + (error?.message || "count null"));
  return count;
}

/** DB lỗi tạm thời -> 503 KHÔNG cache (Google tự thử lại), thay vì cache 1 giờ một sitemap rỗng/thiếu */
export const loiTamThoi = () => new Response("Tạm thời không lấy được dữ liệu", { status: 503, headers: { "Retry-After": "600", "Cache-Control": "no-store" } });

/**
 * Một lô tin (mới nhất trước). PostgREST trả TỐI ĐA 1.000 dòng mỗi lượt (đo 23/9: xin range 5.000
 * vẫn chỉ nhận 1.000) -> phải lặp từng trang 1.000 cho đủ MOI_LO.
 */
export async function loTin(trang: number): Promise<{ id: string; created_at: string | null }[]> {
  const sb = createAnonClient();
  const batDau = trang * MOI_LO;
  const ra: { id: string; created_at: string | null }[] = [];
  for (let off = 0; off < MOI_LO; off += 1000) {
    const { data, error } = await sb.from("listings").select("id,created_at").eq("status", "published")
      .order("first_seen_at", { ascending: false, nullsFirst: false }).order("id")   // khoá phụ: thứ tự ổn định giữa các trang
      .range(batDau + off, batDau + off + 999);
    if (error) throw new Error("loTin: " + error.message);   // 3/10: lỗi từng bị nuốt -> lô 0 rỗng 0 URL
    ra.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return ra;
}
