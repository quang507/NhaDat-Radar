import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// 29/10 (Clarity + Search Console): tên miền Vercel tự cấp vẫn mở ra bản sao của cả site và có khách vào
// (42 lượt vào trang chủ trong 90 ngày) -> Google thấy hai site trùng nhau. Chuyển vĩnh viễn về tên miền chính.
// CHỈ đúng tên miền production này; bản xem trước theo từng commit (…-git-…vercel.app) giữ nguyên.
const TEN_MIEN_VERCEL_CU = "nha-dat-radar-rkyn.vercel.app";
const TEN_MIEN_CHINH = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.nhadatradar.com").replace(/\/+$/, "");

const HUYEN_HCM_SLUG = new Set(["binh-chanh", "nha-be", "hoc-mon", "cu-chi", "can-gio"]);
function slugQuanHcm(raw: string): string {
  const s = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[đĐ]/g, "d")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!s) return "";
  if (/^(quan|huyen|tp)-/.test(s)) return s;
  if (s === "thu-duc" || s === "tp-thu-duc") return "tp-thu-duc";
  return HUYEN_HCM_SLUG.has(s) ? `huyen-${s}` : `quan-${s}`;
}

export async function middleware(request: NextRequest) {
  // đọc header Host (Vercel luôn đặt đúng tên miền khách gõ); bỏ cổng nếu có
  if ((request.headers.get("host") ?? "").split(":")[0].toLowerCase() === TEN_MIEN_VERCEL_CU) {
    return NextResponse.redirect(`${TEN_MIEN_CHINH}${request.nextUrl.pathname}${request.nextUrl.search}`, 308);
  }
  // SEO Audit §4.5: biến thể ?quan= của chuyên đề dưới 3 triệu -> đường dẫn tĩnh để không trùng nội dung / giữ ISR
  if (request.nextUrl.pathname === "/phong-tro-duoi-3-trieu" && request.nextUrl.searchParams.has("quan")) {
    const qSlug = slugQuanHcm(request.nextUrl.searchParams.get("quan") || "");
    const dest = qSlug ? `/nha-dat-cho-thue/ho-chi-minh/${qSlug}/phong-tro/duoi-3-trieu` : "/phong-tro-duoi-3-trieu";
    return NextResponse.redirect(new URL(dest, request.url), 301);
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    {
      // bỏ qua static assets & ảnh. 2/11 (audit 🔴5, 🔴8): thêm sw.js, offline.html, assetlinks (.well-known),
      // manifest, robots, sitemap - không cần làm mới phiên
      source: "/((?!_next/static|_next/image|m/|favicon.ico|sw\\.js|offline\\.html|\\.well-known|manifest\\.webmanifest|robots\\.txt|sitemap.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
      // prefetch của <Link> không chạy middleware (updateSession vốn đã bỏ qua) - lần mở trang thật vẫn làm mới phiên
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
