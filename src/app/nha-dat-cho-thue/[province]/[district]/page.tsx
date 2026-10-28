// /nha-dat-cho-thue/[tinh]/[quan] - trang SEO cấp quận/huyện.
// Nấc 2 cũng nhận SLUG LOẠI BĐS ("/ho-chi-minh/can-ho" = cả tỉnh, lọc căn hộ) - tên quận không bao
// giờ trùng slug loại (can-ho/nha/dat/mat-bang/phong-tro) nên không nhập nhằng.
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
