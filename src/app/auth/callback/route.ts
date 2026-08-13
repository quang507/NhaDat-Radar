import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Đổi OAuth/email code -> session cookie.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const nextRaw = searchParams.get("next") ?? "/dashboard";
  // chỉ chấp nhận đường dẫn nội bộ (chống open-redirect)
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }
  return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent("Xác thực thất bại")}`);
}
