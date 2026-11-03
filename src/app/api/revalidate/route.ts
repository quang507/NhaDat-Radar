import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { timingSafeEqual } from "node:crypto";

// 2/11 (audit): so sánh thời gian hằng, lệch độ dài thì trả false trước (timingSafeEqual ném lỗi)
function khopBiMat(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** null = hợp lệ; còn lại là response lỗi trả luôn */
function kiemBiMat(req: NextRequest): NextResponse | null {
  // 2/11 (audit): chỉ nhận header - query ?secret= bị ghi vào log truy cập/CDN
  const secret = req.headers.get("x-revalidate-secret");
  // 26/10: KHÔNG có mật khẩu dự phòng ghi cứng - chuỗi nằm trong mã nguồn thì ai đọc repo cũng gọi được.
  // Chưa đặt REVALIDATE_SECRET / CRON_SECRET trên Vercel thì endpoint tắt hẳn (503) thay vì mở.
  const expectedSecret = process.env.REVALIDATE_SECRET || process.env.CRON_SECRET;
  if (!expectedSecret) {
    return NextResponse.json({ ok: false, error: "Revalidate disabled: REVALIDATE_SECRET is not set" }, { status: 503 });
  }
  if (!secret || !khopBiMat(secret, expectedSecret)) {
    return NextResponse.json({ ok: false, error: "Unauthorized: Invalid or missing secret token" }, { status: 401 });
  }
  return null;
}

// 3/11: POST {"tags": [...]} - lượt nhập rổ hàng (crawler/xa-cache.mjs) xả đúng các tin vừa đổi ("tin:<id>",
// trang tin) + danh sách khu vực ("ds-tin"). Chỉ nhận tag đúng khuôn, tối đa 1.000 mỗi lần.
const TAG_HOP_LE = /^(tin:[0-9a-f-]{36}|ds-tin)$/i;
export async function POST(req: NextRequest) {
  const loi = kiemBiMat(req);
  if (loi) return loi;
  let tags: unknown;
  try { tags = (await req.json())?.tags; } catch { /* body hỏng */ }
  if (!Array.isArray(tags) || !tags.length || tags.length > 1000 || !tags.every((t) => typeof t === "string" && TAG_HOP_LE.test(t))) {
    return NextResponse.json({ ok: false, error: "tags: 1-1000 tag dạng tin:<uuid> hoặc ds-tin" }, { status: 400 });
  }
  for (const t of new Set(tags as string[])) revalidateTag(t);
  return NextResponse.json({ ok: true, revalidated: tags.length });
}

export async function GET(req: NextRequest) {
  const loi = kiemBiMat(req);
  if (loi) return loi;

  try {
    const path = req.nextUrl.searchParams.get("path");
    const tag = req.nextUrl.searchParams.get("tag");

    if (path) {
      revalidatePath(path);
    } else if (tag) {
      revalidateTag(tag);
    } else {
      revalidatePath("/", "page");
      revalidatePath("/search", "page");
      revalidateTag("areas");
      revalidateTag("listings");
      revalidateTag("projects");
    }

    return NextResponse.json({
      ok: true,
      message: "Revalidated cache successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
