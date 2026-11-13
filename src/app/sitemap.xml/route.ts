// Sitemap INDEX: trỏ sang các sitemap con (khu vực + dự án - Hướng B: bỏ sitemap trang tin)
import { SITE, xmlSitemapIndex, xmlResponse } from "@/lib/sitemap";

export const revalidate = 86400;

export async function GET() {
  const urls = [
    `${SITE}/sitemap-khu-vuc.xml`,
    `${SITE}/sitemap-du-an.xml`,
  ];
  return xmlResponse(xmlSitemapIndex(urls));
}
