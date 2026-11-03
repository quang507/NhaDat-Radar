import type { Metadata } from "next";
import ThematicLanding from "@/components/ThematicLanding";
import { DANH_SACH_CHUYEN_DE } from "@/lib/chuyen-de";

export const revalidate = 3600;

const cd = DANH_SACH_CHUYEN_DE["phong-tro-duoi-3-trieu"];

export const metadata: Metadata = {
  title: cd.metaTitle,
  description: cd.metaDesc,
  alternates: {
    canonical: `/${cd.slug}`,
  },
  openGraph: {
    title: cd.metaTitle,
    description: cd.metaDesc,
    url: `https://nhadatradar.com/${cd.slug}`,
    type: "website",
  },
};

export default function PhongTroDuoi3TrieuPage() {
  return <ThematicLanding slug={cd.slug} />;
}
