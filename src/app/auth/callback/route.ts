import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function dichLoiAuth(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("flow state") || m.includes("code verifier")) {
    return "Phiên đăng nhập Google đã hết hạn hoặc bị gián đoạn, vui lòng bấm Đăng nhập bằng Google lại.";
  }
  return msg || "Xác thực thất bại";
}

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
    return NextResponse.redirect(`${base}/auth?error=${encodeURIComponent(dichLoiAuth(errorParam))}`);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${base}${next}`);
    // Nếu 2 request song song cùng chạm /auth/callback, request trước đã đổi xong code và ghi cookie phiên -> cho đi tiếp thay vì báo flow_state_not_found
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return NextResponse.redirect(`${base}${next}`);
    console.error("Auth callback exchange error:", error.message);
    return NextResponse.redirect(`${base}/auth?error=${encodeURIComponent(dichLoiAuth(error.message))}`);
  }
  return NextResponse.redirect(`${base}/auth?error=${encodeURIComponent("Xác thực thất bại")}`);
}
