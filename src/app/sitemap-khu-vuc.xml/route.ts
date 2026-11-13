// Sitemap khu vực: trang tĩnh + trang tỉnh/quận/loại BĐS + tin tức + điểm neo (dự án tách sang /sitemap-du-an.xml).
import { areaPath, KIND_SLUG } from "@/lib/slug";
import { getAreas } from "@/lib/geo";
import { SITE, xmlSitemap, xmlResponse, loiTamThoi, type MucSitemap } from "@/lib/sitemap";
import { dsQuanBaoCao } from "@/lib/bao-cao-gia";
import { BAI_VIET } from "@/lib/bai-viet";
import { DANH_SACH_DAI_HOC } from "@/lib/dai-hoc";
import { DIEM_NEO } from "@/lib/diem-neo";
import { NGUONG } from "@/lib/seo-index";

export const revalidate = 43200;

export async function GET() {
  const muc: MucSitemap[] = [
    "", "/projects", "/agents", "/thong-ke", "/dinh-gia", "/tinh-lai-vay", "/lap-phong",
    "/thue-hay-mua", "/ban", "/huong-dan/mua", "/huong-dan/ban", "/nha-dat-ban", "/nha-dat-cho-thue", "/tin-tuc",
    "/gioi-thieu", "/lien-he", "/chinh-sach-bao-mat", "/dieu-khoan-su-dung",
  ].map((p) => ({ url: SITE + p, changefreq: "daily", priority: p === "" ? 1 : 0.7 }));

  try {
    const { counts } = await getAreas();
    for (const [p, c] of Object.entries(counts)) {
      for (const deal of ["ban", "cho_thue"] as const) {
        if (c[deal] >= NGUONG.tinh) muc.push({ url: SITE + areaPath(deal, p), changefreq: "daily", priority: 0.8 });
        for (const [k, kc] of Object.entries(c.kinds || {})) {
          if (KIND_SLUG[k] && kc[deal] >= NGUONG.loai) muc.push({ url: SITE + areaPath(deal, p, null, k), changefreq: "daily", priority: 0.75 });
        }
        for (const [d, dc] of Object.entries(c.districts)) {
          if (dc[deal] >= NGUONG.quan) muc.push({ url: SITE + areaPath(deal, p, d), changefreq: "daily", priority: 0.7 });
          for (const [k, kc] of Object.entries(dc.kinds || {})) {
            if (KIND_SLUG[k] && kc[deal] >= NGUONG.loai) muc.push({ url: SITE + areaPath(deal, p, d, k), changefreq: "daily", priority: 0.65 });
          }
        }
      }
    }
    // tin tức (3/10): báo cáo giá thuê theo quận (đổi mỗi ngày) + bài hướng dẫn
    for (const q of await dsQuanBaoCao()) muc.push({ url: `${SITE}/tin-tuc/gia-thue-phong-tro-${q.slug}`, changefreq: "daily", priority: 0.8 });
    for (const b of BAI_VIET) muc.push({ url: `${SITE}/tin-tuc/${b.slug}`, lastmod: b.ngay, changefreq: "monthly", priority: 0.6 });
    muc.push({ url: `${SITE}/phong-tro-gan-truong-dai-hoc`, changefreq: "daily", priority: 0.85 });
    for (const u of DANH_SACH_DAI_HOC) muc.push({ url: `${SITE}/phong-tro-gan-truong-dai-hoc/${u.slug}`, changefreq: "daily", priority: 0.8 });
    // chuyen de hot
    for (const cd of ["phong-tro-duoi-3-trieu", "phong-tro-co-gac-lung", "can-ho-mini-full-noi-that"]) muc.push({ url: `${SITE}/${cd}`, changefreq: "daily", priority: 0.85 });
    // Diem neo pSEO chien luoc (Metro, San bay, Benh vien, KCN)
    for (const d of DIEM_NEO) muc.push({ url: `${SITE}/phong-tro-gan/${d.slug}`, changefreq: "daily", priority: 0.85 });
  } catch (e) {
    console.error(String(e));
    return loiTamThoi();
  }

  return xmlResponse(xmlSitemap(muc));
}
