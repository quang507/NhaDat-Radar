import { HubGiaoDich, hubMeta } from "@/components/AreaLanding";

export const revalidate = 21600;

export async function generateMetadata() {
  return hubMeta("cho_thue");
}

export default function NhaDatChoThuePage() {
  return <HubGiaoDich deal="cho_thue" />;
}
