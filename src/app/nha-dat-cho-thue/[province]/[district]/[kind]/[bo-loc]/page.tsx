// Bộ lọc tĩnh cho phòng trọ cấp quận (/nha-dat-cho-thue/[province]/[district]/[kind]/[bo-loc])
// SEO Audit §4.5: thay thế query ?quan= / ?priceMax= bằng URL tĩnh chuẩn ISR để Google index các tổ hợp nhiều phòng.
export const revalidate = 43200;

// Trả [] = dựng lần đầu khi có người mở rồi cache ISR (như route [kind]/page.tsx), tránh bắn hàng trăm truy vấn song song làm nghẽn Supabase lúc build.
export async function generateStaticParams() {
  return [];
}

import { notFound } from "next/navigation";
import AreaLanding, { areaMeta } from "@/components/AreaLanding";
import { kindFromSlug } from "@/lib/slug";
import { boLocTuSlug } from "@/lib/seo-index";

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
