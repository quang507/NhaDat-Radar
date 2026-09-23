// /nha-dat-cho-thue/[tinh]/[quan] - trang SEO cấp quận/huyện.
// Nấc 2 cũng nhận SLUG LOẠI BĐS ("/ho-chi-minh/can-ho" = cả tỉnh, lọc căn hộ) - tên quận không bao
// giờ trùng slug loại (can-ho/nha/dat/mat-bang/phong-tro) nên không nhập nhằng.
export const dynamic = "force-dynamic";
import AreaLanding, { areaMeta } from "@/components/AreaLanding";
import { kindFromSlug } from "@/lib/slug";

export async function generateMetadata({ params }: { params: Promise<{ province: string; district: string }> }) {
  const { province, district } = await params;
  const kind = kindFromSlug(district);
  return kind ? areaMeta("cho_thue", province, undefined, district) : areaMeta("cho_thue", province, district);
}

export default async function Page({ params }: { params: Promise<{ province: string; district: string }> }) {
  const { province, district } = await params;
  const kind = kindFromSlug(district);
  return kind
    ? <AreaLanding deal="cho_thue" provinceSlug={province} kind={kind} />
    : <AreaLanding deal="cho_thue" provinceSlug={province} districtSlug={district} />;
}
