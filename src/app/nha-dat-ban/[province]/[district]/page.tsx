// /nha-dat-ban/[tinh]/[quan] — trang SEO cấp quận/huyện
export const dynamic = "force-dynamic";
import AreaLanding, { resolveArea, areaTitle } from "@/components/AreaLanding";

export async function generateMetadata({ params }: { params: Promise<{ province: string; district: string }> }) {
  const { province, district } = await params;
  const r = await resolveArea(province, district);
  if (!r || !r.district) return { title: "Không tìm thấy khu vực - NhaDat Radar" };
  const n = r.area.districts.get(r.district)?.ban ?? 0;
  return {
    title: areaTitle("ban", r.province, r.district, n),
    description: `${n.toLocaleString("vi-VN")} tin bán nhà đất tại ${r.district}, ${r.province}: giá phổ biến, trung vị theo loại hình, cảnh báo giá lệch, nguồn từng tin. Cập nhật hằng ngày trên NhaDat Radar.`,
    alternates: { canonical: `/nha-dat-ban/${province}/${district}` },
  };
}

export default async function Page({ params }: { params: Promise<{ province: string; district: string }> }) {
  const { province, district } = await params;
  return <AreaLanding deal="ban" provinceSlug={province} districtSlug={district} />;
}
