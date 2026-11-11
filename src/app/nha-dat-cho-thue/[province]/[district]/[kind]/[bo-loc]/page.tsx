// Bộ lọc tĩnh cho phòng trọ cấp quận (/nha-dat-cho-thue/[province]/[district]/[kind]/[bo-loc])
// SEO Audit §4.5: thay thế query ?quan= / ?priceMax= bằng URL tĩnh chuẩn ISR để Google index các tổ hợp nhiều phòng.
export const revalidate = 43200;

export async function generateStaticParams() {
  try {
    const { counts } = await getAreas();
    const params: { province: string; district: string; kind: string; "bo-loc": string }[] = [];
    for (const [p, c] of Object.entries(counts)) {
      const pSlug = slugify(p);
      for (const [d, dc] of Object.entries(c.districts)) {
        if ((dc.kinds?.phong_tro?.cho_thue ?? 0) >= NGUONG.boLoc) {
          const dSlug = slugify(d);
          for (const boLoc of Object.keys(BO_LOC_SEO)) {
            params.push({ province: pSlug, district: dSlug, kind: "phong-tro", "bo-loc": boLoc });
          }
        }
      }
    }
    return params;
  } catch {
    return [];
  }
}

import { notFound } from "next/navigation";
import AreaLanding, { areaMeta } from "@/components/AreaLanding";
import { getAreas } from "@/lib/geo";
import { slugify, kindFromSlug } from "@/lib/slug";
import { BO_LOC_SEO, boLocTuSlug, NGUONG } from "@/lib/seo-index";

type Params = { params: Promise<{ province: string; district: string; kind: string; "bo-loc": string }> };

export async function generateMetadata({ params }: Params) {
  const p = await params;
  if (kindFromSlug(p.kind) !== "phong_tro" || !boLocTuSlug(p["bo-loc"])) return { title: "Không tìm thấy trang - NhaDat Radar" };
  return areaMeta("cho_thue", p.province, p.district, p.kind, p["bo-loc"]);
}

export default async function Page({ params }: Params) {
  const p = await params;
  const k = kindFromSlug(p.kind);
  if (k !== "phong_tro" || !boLocTuSlug(p["bo-loc"])) notFound();
  return <AreaLanding deal="cho_thue" provinceSlug={p.province} districtSlug={p.district} kind={k} boLocSlug={p["bo-loc"]} />;
}
