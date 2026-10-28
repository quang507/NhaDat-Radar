// /nha-dat-ban/[tinh] - trang SEO cấp tỉnh (số liệu thật + FAQ + JSON-LD). Xem src/components/AreaLanding.tsx
// ISR 1 giờ (thực tế 30 phút: cây khu vực getAreas cache 1800s, Next lấy mức nhỏ nhất): trang khu vực là tài sản SEO, dữ liệu đổi theo lượt crawl (4h/lần) nên không cần
// dựng lại mỗi request. Trước 23/9 mọi trang force-dynamic -> Google tốn ngân sách thu thập, TTFB cao.
export const revalidate = 3600;

// 28/10: thiếu hàm này thì route là ƒ Dynamic - Vercel trả "private, no-store", `revalidate` vô tác dụng,
// mỗi lượt bot vào là dựng lại ~390KB -> vượt hạn mức Fast Origin Transfer. Trả [] = dựng lần đầu khi có
// người mở rồi cache ISR (như /listings/[id]).
export async function generateStaticParams() {
  return [];
}
import AreaLanding, { areaMeta } from "@/components/AreaLanding";

export async function generateMetadata({ params }: { params: Promise<{ province: string }> }) {
  const { province } = await params;
  return areaMeta("ban", province);
}

export default async function Page({ params }: { params: Promise<{ province: string }> }) {
  const { province } = await params;
  return <AreaLanding deal="ban" provinceSlug={province} />;
}
