// /nha-dat-cho-thue/[tinh]/[quan]/[loai] - trang SEO theo LOẠI BĐS trong một quận (23/9).
// Trang tin chỉ sống ~3 tuần rồi bị xoá, còn URL khu vực thì ổn định -> đây mới là trang đáng để Google index.
// ISR 10 phút: trang khu vực là tài sản SEO, dữ liệu đổi theo lượt crawl (4h/lần) nên không cần
// dựng lại mỗi request. Trước 23/9 mọi trang force-dynamic -> Google tốn ngân sách thu thập, TTFB cao.
export const revalidate = 600;
import { notFound } from "next/navigation";
import AreaLanding, { areaMeta } from "@/components/AreaLanding";
import { kindFromSlug } from "@/lib/slug";

export async function generateMetadata({ params }: { params: Promise<{ province: string; district: string; kind: string }> }) {
  const { province, district, kind } = await params;
  return areaMeta("cho_thue", province, district, kind);
}

export default async function Page({ params }: { params: Promise<{ province: string; district: string; kind: string }> }) {
  const { province, district, kind } = await params;
  const k = kindFromSlug(kind);
  if (!k) notFound();
  return <AreaLanding deal="cho_thue" provinceSlug={province} districtSlug={district} kind={k} />;
}
