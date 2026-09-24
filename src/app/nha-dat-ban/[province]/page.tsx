// /nha-dat-ban/[tinh] - trang SEO cấp tỉnh (số liệu thật + FAQ + JSON-LD). Xem src/components/AreaLanding.tsx
// ISR 10 phút: trang khu vực là tài sản SEO, dữ liệu đổi theo lượt crawl (4h/lần) nên không cần
// dựng lại mỗi request. Trước 23/9 mọi trang force-dynamic -> Google tốn ngân sách thu thập, TTFB cao.
export const revalidate = 600;
import AreaLanding, { areaMeta } from "@/components/AreaLanding";

export async function generateMetadata({ params }: { params: Promise<{ province: string }> }) {
  const { province } = await params;
  return areaMeta("ban", province);
}

export default async function Page({ params }: { params: Promise<{ province: string }> }) {
  const { province } = await params;
  return <AreaLanding deal="ban" provinceSlug={province} />;
}
