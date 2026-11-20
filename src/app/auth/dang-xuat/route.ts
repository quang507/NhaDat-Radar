import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Xoá cookie phiên phía server (NutDangXuat gọi sau khi supabase-js đã đăng xuất ở trình duyệt).
// Chỉ phiên của máy này (scope local); lỗi mạng tới Supabase vẫn xoá được cookie nên luôn trả 204.
export async function POST() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // bỏ qua: cookie đã bị xoá ở bước trình duyệt
  }
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "private, no-store" } });
}
