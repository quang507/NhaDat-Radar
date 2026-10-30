import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// 29/10 (Clarity + Search Console): tên miền Vercel tự cấp vẫn mở ra bản sao của cả site và có khách vào
// (42 lượt vào trang chủ trong 90 ngày) -> Google thấy hai site trùng nhau. Chuyển vĩnh viễn về tên miền chính.
// CHỈ đúng tên miền production này; bản xem trước theo từng commit (…-git-…vercel.app) giữ nguyên.
const TEN_MIEN_VERCEL_CU = "nha-dat-radar-rkyn.vercel.app";
const TEN_MIEN_CHINH = "https://nhadatradar.com";

export async function middleware(request: NextRequest) {
  // đọc header Host (Vercel luôn đặt đúng tên miền khách gõ); bỏ cổng nếu có
  if ((request.headers.get("host") ?? "").split(":")[0].toLowerCase() === TEN_MIEN_VERCEL_CU) {
    return NextResponse.redirect(`${TEN_MIEN_CHINH}${request.nextUrl.pathname}${request.nextUrl.search}`, 308);
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    // bỏ qua static assets & ảnh
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
