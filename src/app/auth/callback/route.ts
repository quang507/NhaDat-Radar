import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Đổi OAuth/email code -> session cookie.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const errorParam = url.searchParams.get("error_description") || url.searchParams.get("error");
  const nextRaw = url.searchParams.get("next") ?? "/dashboard";
  // chỉ chấp nhận đường dẫn nội bộ (chống open-redirect)
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "/dashboard";

  // Bảo đảm domain redirect khớp với host người dùng đang duyệt (tránh 308 redirect giữa apex và www làm mất cookie)
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") || "https";
  const base = host ? `${proto}://${host}` : url.origin;

  if (errorParam) {
    console.error("Auth callback error from provider:", errorParam);
    return NextResponse.redirect(`${base}/auth?error=${encodeURIComponent(errorParam)}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${base}${next}`);
    console.error("Auth callback exchange error:", error.message);
    return NextResponse.redirect(`${base}/auth?error=${encodeURIComponent(error.message || "Xác thực thất bại")}`);
  }
  return NextResponse.redirect(`${base}/auth?error=${encodeURIComponent("Xác thực thất bại")}`);
}
