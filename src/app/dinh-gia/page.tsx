export const dynamic = "force-dynamic";

import { getAreas } from "@/lib/geo";
import ValuationClient from "./ValuationClient";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Định Giá Bất Động Sản - Ước Tính Giá Nhà Đất Chuẩn Xác | NhaDat Radar",
  description: "Công cụ định giá nhà đất thông minh ứng dụng AI: so sánh tức thì với giá thị trường theo quận, diện tích, mặt tiền, số tầng và vị trí tại Hà Nội & TP.HCM.",
  alternates: { canonical: "/dinh-gia" },
  openGraph: {
    type: "website",
    title: "AI Định Giá Bất Động Sản - Ước Tính Giá Nhà Đất Chuẩn Xác | NhaDat Radar",
    description: "Công cụ định giá nhà đất thông minh ứng dụng AI: so sánh giá thị trường theo quận, diện tích, vị trí.",
    url: "https://nhadatradar.com/dinh-gia",
  },
};

export default async function ValuationPage() {
  // Cây khu vực từ lib/geo (cache 10', phân trang tới 20k dòng, quận đã canonDistrict).
  // Bản cũ tự select 2000 dòng đầu KHÔNG order - DB vượt 2000 tin là tỉnh của người dùng
  // có thể vắng khỏi dropdown tuỳ heap, form lại required nên họ kẹt luôn (soát 21/8).
  const { geo: tree } = await getAreas();
  const geo: Record<string, string[]> = {};
  for (const p of Object.keys(tree)) geo[p] = Object.keys(tree[p]).sort();

  return <ValuationClient geo={geo} />;
}
