// Sitemap INDEX: trỏ sang các sitemap con (khu vực + từng lô tin). Thay cho app/sitemap.ts cũ vốn
// nhét tất cả vào một file rồi cắt ở 1.000 tin (23/9).
import { SITE, MOI_LO, demTin, xmlSitemapIndex, xmlResponse } from "@/lib/sitemap";

export const revalidate = 3600;

export async function GET() {
  let soLo = 1;
  try { soLo = Math.max(1, Math.ceil((await demTin()) / MOI_LO)); } catch { /* DB lỗi -> vẫn trả index tối thiểu */ }
  const urls = [`${SITE}/sitemap-khu-vuc.xml`, ...Array.from({ length: soLo }, (_, i) => `${SITE}/sitemap-tin/${i}.xml`)];
  return xmlResponse(xmlSitemapIndex(urls));
}
