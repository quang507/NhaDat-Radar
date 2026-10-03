// Sitemap INDEX: trỏ sang các sitemap con (khu vực + từng lô tin). Thay cho app/sitemap.ts cũ vốn
// nhét tất cả vào một file rồi cắt ở 1.000 tin (23/9).
import { SITE, MOI_LO, demTin, xmlSitemapIndex, xmlResponse, loiTamThoi } from "@/lib/sitemap";

// 3/10: động + cache CDN 1 giờ (xmlResponse s-maxage) thay vì ISR - ISR từng giữ 1 giờ bản index THIẾU lô khi DB lỗi tạm
export const dynamic = "force-dynamic";

export async function GET() {
  let soLo: number;
  try { soLo = Math.max(1, Math.ceil((await demTin()) / MOI_LO)); } catch (e) { console.error(String(e)); return loiTamThoi(); }
  const urls = [`${SITE}/sitemap-khu-vuc.xml`, ...Array.from({ length: soLo }, (_, i) => `${SITE}/sitemap-tin/${i}.xml`)];
  return xmlResponse(xmlSitemapIndex(urls));
}
