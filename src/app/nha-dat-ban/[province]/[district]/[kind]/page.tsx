// /nha-dat-ban/[tinh]/[quan]/[loai] - trang SEO theo LOẠI BĐS trong một quận (23/9).
// Trang tin chỉ sống ~3 tuần rồi bị xoá, còn URL khu vực thì ổn định -> đây mới là trang đáng để Google index.
// ISR 1 giờ (thực tế 30 phút: cây khu vực getAreas cache 1800s, Next lấy mức nhỏ nhất): trang khu vực là tài sản SEO, dữ liệu đổi theo lượt crawl (4h/lần) nên không cần
// dựng lại mỗi request. Trước 23/9 mọi trang force-dynamic -> Google tốn ngân sách thu thập, TTFB cao.
export const revalidate = 3600;

// 28/10: thiếu hàm này thì route là ƒ Dynamic - Vercel trả "private, no-store", `revalidate` vô tác dụng,
// mỗi lượt bot vào là dựng lại ~390KB -> vượt hạn mức Fast Origin Transfer. Trả [] = dựng lần đầu khi có
// người mở rồi cache ISR (như /listings/[id]).
export async function generateStaticParams() {
  return [];
}
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
