export const dynamic = "force-dynamic";

import { getAreas } from "@/lib/geo";
import ValuationClient from "./ValuationClient";

export const metadata = { title: "AI định giá bất động sản - NhaDat Radar" };

export default async function ValuationPage() {
  // Cây khu vực từ lib/geo (cache 10', phân trang tới 20k dòng, quận đã canonDistrict).
  // Bản cũ tự select 2000 dòng đầu KHÔNG order - DB vượt 2000 tin là tỉnh của người dùng
  // có thể vắng khỏi dropdown tuỳ heap, form lại required nên họ kẹt luôn (soát 21/8).
  const { geo: tree } = await getAreas();
  const geo: Record<string, string[]> = {};
  for (const p of Object.keys(tree)) geo[p] = Object.keys(tree[p]).sort();

  return <ValuationClient geo={geo} />;
}
