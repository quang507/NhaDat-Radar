import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

type CookieToSet = { name: string; value: string; options: CookieOptions };

// Refresh session cookie (bắt buộc với SSR auth).
// 1/10 GIẢM LƯỢT GỌI SUPABASE: bản cũ gọi auth.getUser() ở MỌI request - với người đã đăng nhập là 1 lượt
// gọi Auth server mỗi lần chuyển trang, mỗi link prefetch, mỗi API. Middleware chỉ có nhiệm vụ làm mới
// token hết hạn, không phân quyền gì (trang/route cần quyền vẫn tự gọi getUser()) -> dùng getSession():
// đọc cookie tại chỗ, chỉ gọi mạng khi token sắp hết hạn (~1 giờ/lần). Bỏ qua hẳn khi:
//   - không có cookie phiên Supabase (khách vãng lai, bot) -> không có gì để làm mới
//   - request prefetch của Next (<Link> tự tải trước) -> lần mở trang thật sẽ làm mới
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const coPhien = request.cookies.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token"));
  const laPrefetch = request.headers.get("next-router-prefetch") === "1" || request.headers.get("purpose") === "prefetch";
  if (!coPhien || laPrefetch) return response;

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Không đặt code khác giữa createServerClient và getSession() (tránh mất session).
  await supabase.auth.getSession();

  return response;
}
