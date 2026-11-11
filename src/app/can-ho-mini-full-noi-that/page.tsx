import type { Metadata } from "next";
import ThematicLanding from "@/components/ThematicLanding";
import { DANH_SACH_CHUYEN_DE } from "@/lib/chuyen-de";
import { SITE_URL } from "@/lib/ld";

export const revalidate = 43200;

const cd = DANH_SACH_CHUYEN_DE["can-ho-mini-full-noi-that"];

export const metadata: Metadata = {
  title: cd.metaTitle,
  description: cd.metaDesc,
  alternates: {
    canonical: `/${cd.slug}`,
  },
  openGraph: {
    title: cd.metaTitle,
    description: cd.metaDesc,
    url: `${SITE_URL}/${cd.slug}`,
    type: "website",
  },
};

export default function CanHoMiniFullNoiThatPage() {
  return <ThematicLanding slug={cd.slug} />;
}
