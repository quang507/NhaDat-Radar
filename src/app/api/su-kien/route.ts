import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/supabase/anon";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ghiSuKien, LOAI_SU_KIEN, type LoaiSuKien } from "@/lib/su-kien";

// 3/11 (UX audit #16): phiên admin chiếm ~21% sự kiện (5 mã khách đầu) -> không ghi. Chỉ hỏi DB khi có cookie phiên,
// nhớ kết quả 10 phút / user để mỗi lượt xem không thêm 2 truy vấn.
const COOKIE_PHIEN = /^sb-.+-auth-token(\.\d+)?$/;
const nhoAdmin = new Map<string, { admin: boolean; den: number }>();
async function laAdmin(req: NextRequest) {
  if (!req.cookies.getAll().some((c) => COOKIE_PHIEN.test(c.name))) return false;
  const { data: { user } } = await (await createClient()).auth.getUser();
  if (!user) return false;
  const nho = nhoAdmin.get(user.id);
  if (nho && nho.den > Date.now()) return nho.admin;
  const { data } = await createAdminClient().from("profiles").select("role").eq("id", user.id).maybeSingle();
  const admin = data?.role === "admin";
  if (nhoAdmin.size > 500) nhoAdmin.clear();
  nhoAdmin.set(user.id, { admin, den: Date.now() + 600_000 });
  return admin;
}

// Nhận sự kiện quan tâm từ trình duyệt (navigator.sendBeacon) - bảng su_kien, migration 031.
// Ghi bằng service_role phía server, giới hạn 60 sự kiện/phút/IP (không mở insert cho anon).
// Luôn trả 204: đây là đo đạc, không bao giờ làm phiền khách kể cả khi DB lỗi / chưa chạy migration.
export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "?";
  if (!rateLimit(`su-kien:${ip}`, 60, 60_000)) return new NextResponse(null, { status: 204 });
  try {
    const b = JSON.parse(await req.text()) as { loai?: string; listingId?: string; khach?: string; nguon?: string; thietBi?: string };
    if (!b.loai || !(LOAI_SU_KIEN as readonly string[]).includes(b.loai) || b.loai === "chat" || b.loai === "dat_lich") {
      return new NextResponse(null, { status: 204 });   // chat/đặt lịch chỉ ghi từ server, không nhận từ client
    }
    if (await laAdmin(req).catch(() => false)) return new NextResponse(null, { status: 204 });
    await ghiSuKien({ loai: b.loai as LoaiSuKien, listingId: b.listingId, khach: b.khach, nguon: b.nguon, thietBi: b.thietBi });
  } catch { /* body hỏng - bỏ qua */ }
  return new NextResponse(null, { status: 204 });
}
