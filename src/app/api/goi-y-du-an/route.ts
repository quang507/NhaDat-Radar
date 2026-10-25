import { NextResponse } from "next/server";
import { layDuAnToaDo, goiYDuAn } from "@/lib/du-an";

// Gợi ý dự án cho ô tìm kiếm (26/10): gõ "nyah" -> Ny'ah Bình Tây kèm toạ độ để lọc tin quanh dự án.
// Danh sách ~2.200 dự án quá nặng để gửi xuống trình duyệt -> lọc ở server, trả tối đa 6, cache CDN 1 giờ.
export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") || "").slice(0, 80);
  const ds = q.trim().length >= 2 ? goiYDuAn(await layDuAnToaDo().catch(() => []), q, 6) : [];
  return NextResponse.json(
    ds.map((p) => ({ id: p.id, name: p.name, sub: [p.district, p.province].filter(Boolean).join(", "), lat: +p.lat.toFixed(6), lng: +p.lng.toFixed(6) })),
    { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
