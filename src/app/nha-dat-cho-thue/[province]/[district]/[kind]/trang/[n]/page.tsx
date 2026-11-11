// Phân trang tĩnh cho khu vực (/nha-dat-cho-thue/[province]/[district]/[kind]/trang/2..10)
// SEO Audit §3.1: giúp Googlebot duyệt sâu danh sách tin theo từng trang tĩnh (noindex, follow từ trang 2).
export const revalidate = 43200;

export async function generateStaticParams() {
  return [];
}

import { notFound, redirect } from "next/navigation";
import AreaLanding, { areaMeta } from "@/components/AreaLanding";
import { kindFromSlug } from "@/lib/slug";
import { TRANG_TINH_TOI_DA } from "@/lib/seo-index";

type Params = { params: Promise<{ province: string; district: string; kind: string; n: string }> };

function parseTrang(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= TRANG_TINH_TOI_DA ? n : null;
}

export async function generateMetadata({ params }: Params) {
  const p = await params;
  const trang = parseTrang(p.n);
  if (!trang || trang < 2 || !kindFromSlug(p.kind)) return { title: "Không tìm thấy trang - NhaDat Radar" };
  return areaMeta("cho_thue", p.province, p.district, p.kind, undefined, trang);
}

export default async function Page({ params }: Params) {
  const p = await params;
  const k = kindFromSlug(p.kind);
  const trang = parseTrang(p.n);
  if (!k || !trang) notFound();
  if (trang === 1) redirect(`/nha-dat-cho-thue/${p.province}/${p.district}/${p.kind}`);
  return <AreaLanding deal="cho_thue" provinceSlug={p.province} districtSlug={p.district} kind={k} trang={trang} />;
}
