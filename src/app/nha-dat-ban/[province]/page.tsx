// /nha-dat-ban/[tinh] - trang SEO cấp tỉnh (số liệu thật + FAQ + JSON-LD). Xem src/components/AreaLanding.tsx
export const dynamic = "force-dynamic";
import AreaLanding, { areaMeta } from "@/components/AreaLanding";

export async function generateMetadata({ params }: { params: Promise<{ province: string }> }) {
  const { province } = await params;
  return areaMeta("ban", province);
}

export default async function Page({ params }: { params: Promise<{ province: string }> }) {
  const { province } = await params;
  return <AreaLanding deal="ban" provinceSlug={province} />;
}
