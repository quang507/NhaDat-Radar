// /nha-dat-ban/[tinh] - trang SEO cấp tỉnh (số liệu thật + FAQ + JSON-LD). Xem src/components/AreaLanding.tsx
export const dynamic = "force-dynamic";
import AreaLanding, { resolveArea, areaTitle } from "@/components/AreaLanding";

export async function generateMetadata({ params }: { params: Promise<{ province: string }> }) {
  const { province } = await params;
  const r = await resolveArea(province);
  if (!r) return { title: "Không tìm thấy khu vực - NhaDat Radar" };
  const n = r.area.ban;
  return {
    title: areaTitle("ban", r.province, null, n),
    description: `${n.toLocaleString("vi-VN")} tin bán nhà đất, căn hộ, đất nền tại ${r.province} tổng hợp từ nhiều nguồn, kèm giá phổ biến theo quận, cảnh báo giá lệch và dấu hiệu môi giới/chính chủ. Cập nhật hằng ngày.`,
    alternates: { canonical: `/nha-dat-ban/${province}` },
  };
}

export default async function Page({ params }: { params: Promise<{ province: string }> }) {
  const { province } = await params;
  return <AreaLanding deal="ban" provinceSlug={province} />;
}
