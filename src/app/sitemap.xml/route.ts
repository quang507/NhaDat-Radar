// Sitemap INDEX: trỏ sang các sitemap con (khu vực + tin theo tháng)
import { SITE, thangCoTin, xmlSitemapIndex, xmlResponse, loiTamThoi } from "@/lib/sitemap";

export const revalidate = 86400;

export async function GET() {
  let thangs: string[];
  try {
    thangs = await thangCoTin();
  } catch (e) {
    console.error(String(e));
    return loiTamThoi();
  }
  const urls = [
    `${SITE}/sitemap-khu-vuc.xml`,
    `${SITE}/sitemap-du-an.xml`,
    ...thangs.map((thang) => `${SITE}/sitemap-tin/${thang}.xml`),
  ];
  return xmlResponse(xmlSitemapIndex(urls));
}
