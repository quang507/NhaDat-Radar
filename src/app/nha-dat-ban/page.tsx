import { HubGiaoDich, hubMeta } from "@/components/AreaLanding";

export const revalidate = 3600;

export async function generateMetadata() {
  return hubMeta("ban");
}

export default function NhaDatBanPage() {
  return <HubGiaoDich deal="ban" />;
}
