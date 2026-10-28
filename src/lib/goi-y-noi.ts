// Danh sách địa danh cho ô gợi ý (PlaceSuggest). Tách khỏi components/PlaceSuggest ("use client") vì trang chủ
// là Server Component - gọi hàm của file client sẽ lỗi lúc prerender.
export type Place = { level: "province" | "district" | "ward"; province: string; district?: string; ward?: string; label: string; sub: string };

export function buildPlaces(geo: Record<string, Record<string, string[]>>): Place[] {
  const out: Place[] = [];
  for (const [p, ds] of Object.entries(geo)) {
    out.push({ level: "province", province: p, label: p, sub: "Tỉnh/Thành phố" });
    for (const [d, ws] of Object.entries(ds)) {
      out.push({ level: "district", province: p, district: d, label: d, sub: p });
      for (const w of ws) out.push({ level: "ward", province: p, district: d, ward: w, label: w, sub: `${d}, ${p}` });
    }
  }
  return out;
}
