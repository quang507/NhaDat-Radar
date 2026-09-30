import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/supabase/anon";
import { ghiSuKien, LOAI_SU_KIEN, type LoaiSuKien } from "@/lib/su-kien";

// Nhận sự kiện quan tâm từ trình duyệt (navigator.sendBeacon) - bảng su_kien, migration 031.
// Ghi bằng service_role phía server, giới hạn 60 sự kiện/phút/IP (không mở insert cho anon).
// Luôn trả 204: đây là đo đạc, không bao giờ làm phiền khách kể cả khi DB lỗi / chưa chạy migration.
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "?";
  if (!rateLimit(`su-kien:${ip}`, 60, 60_000)) return new NextResponse(null, { status: 204 });
  try {
    const b = JSON.parse(await req.text()) as { loai?: string; listingId?: string; khach?: string };
    if (!b.loai || !(LOAI_SU_KIEN as readonly string[]).includes(b.loai) || b.loai === "chat" || b.loai === "dat_lich") {
      return new NextResponse(null, { status: 204 });   // chat/đặt lịch chỉ ghi từ server, không nhận từ client
    }
    await ghiSuKien({ loai: b.loai as LoaiSuKien, listingId: b.listingId, khach: b.khach });
  } catch { /* body hỏng - bỏ qua */ }
  return new NextResponse(null, { status: 204 });
}
