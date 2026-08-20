// /nha-dat-cho-thue/[tinh] - trang SEO cấp tỉnh (cho thuê)
export const dynamic = "force-dynamic";
import AreaLanding, { resolveArea, areaTitle } from "@/components/AreaLanding";

export async function generateMetadata({ params }: { params: Promise<{ province: string }> }) {
  const { province } = await params;
  const r = await resolveArea(province);
  if (!r) return { title: "Không tìm thấy khu vực - NhaDat Radar" };
  const n = r.area.cho_thue;
  return {
    title: areaTitle("cho_thue", r.province, null, n),
    description: `${n.toLocaleString("vi-VN")} tin cho thuê nhà, phòng trọ, căn hộ, mặt bằng tại ${r.province} tổng hợp từ nhiều nguồn, kèm giá thuê phổ biến theo quận và cảnh báo tin bất thường. Cập nhật hằng ngày.`,
    alternates: { canonical: `/nha-dat-cho-thue/${province}` },
  };
}

export default async function Page({ params }: { params: Promise<{ province: string }> }) {
  const { province } = await params;
  return <AreaLanding deal="cho_thue" provinceSlug={province} />;
}
