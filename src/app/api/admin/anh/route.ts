import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Tải ảnh gốc rổ hàng về máy admin (nút "Tải ảnh" ở /admin?tab=dang-bai) - 28/9.
// Chỉ admin, chỉ domain ảnh của đối tác rổ hàng: không thành proxy mở cho ai cũng gọi.
const HOST_CHO_PHEP = ["media.evohome.it.com"];

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (prof?.role !== "admin") return new NextResponse("Forbidden", { status: 403 });

  let url: URL;
  try { url = new URL(req.nextUrl.searchParams.get("u") || ""); } catch { return new NextResponse("Bad url", { status: 400 }); }
  if (url.protocol !== "https:" || !HOST_CHO_PHEP.includes(url.hostname)) return new NextResponse("Host not allowed", { status: 400 });

  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok || !res.body) return new NextResponse("Upstream error", { status: 502 });
  const type = res.headers.get("content-type") || "image/jpeg";
  if (!type.startsWith("image/")) return new NextResponse("Not an image", { status: 400 });
  const n = (req.nextUrl.searchParams.get("n") || "1").replace(/\D/g, "").slice(0, 3) || "1";
  const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg";
  return new NextResponse(res.body, {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `attachment; filename="phong-${n}.${ext}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
