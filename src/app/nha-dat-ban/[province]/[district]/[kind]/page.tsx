// /nha-dat-ban/[tinh]/[quan]/[loai] - trang SEO theo LOẠI BĐS trong một quận (23/9).
// Trang tin chỉ sống ~3 tuần rồi bị xoá, còn URL khu vực thì ổn định -> đây mới là trang đáng để Google index.
export const dynamic = "force-dynamic";
import { notFound } from "next/navigation";
import AreaLanding, { areaMeta } from "@/components/AreaLanding";
import { kindFromSlug } from "@/lib/slug";

export async function generateMetadata({ params }: { params: Promise<{ province: string; district: string; kind: string }> }) {
  const { province, district, kind } = await params;
  return areaMeta("ban", province, district, kind);
}

export default async function Page({ params }: { params: Promise<{ province: string; district: string; kind: string }> }) {
  const { province, district, kind } = await params;
  const k = kindFromSlug(kind);
  if (!k) notFound();
  return <AreaLanding deal="ban" provinceSlug={province} districtSlug={district} kind={k} />;
}
