// /nha-dat-cho-thue/[tinh]/[quan] — trang SEO cấp quận/huyện (cho thuê)
export const dynamic = "force-dynamic";
import AreaLanding, { resolveArea, areaTitle } from "@/components/AreaLanding";

export async function generateMetadata({ params }: { params: Promise<{ province: string; district: string }> }) {
  const { province, district } = await params;
  const r = await resolveArea(province, district);
  if (!r || !r.district) return { title: "Không tìm thấy khu vực - NhaDat Radar" };
  const n = r.area.districts[r.district]?.cho_thue ?? 0;
  return {
    title: areaTitle("cho_thue", r.province, r.district, n),
    description: `${n.toLocaleString("vi-VN")} tin cho thuê nhà đất tại ${r.district}, ${r.province}: giá thuê phổ biến, trung vị theo loại hình, nguồn từng tin, cảnh báo giá lệch. Cập nhật hằng ngày trên NhaDat Radar.`,
    alternates: { canonical: `/nha-dat-cho-thue/${province}/${district}` },
  };
}

export default async function Page({ params }: { params: Promise<{ province: string; district: string }> }) {
  const { province, district } = await params;
  return <AreaLanding deal="cho_thue" provinceSlug={province} districtSlug={district} />;
}
