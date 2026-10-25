import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret") || req.headers.get("x-revalidate-secret");
  // 26/10: KHÔNG có mật khẩu dự phòng ghi cứng - chuỗi nằm trong mã nguồn thì ai đọc repo cũng gọi được.
  // Chưa đặt REVALIDATE_SECRET / CRON_SECRET trên Vercel thì endpoint tắt hẳn (503) thay vì mở.
  const expectedSecret = process.env.REVALIDATE_SECRET || process.env.CRON_SECRET;
  if (!expectedSecret) {
    return NextResponse.json({ ok: false, error: "Revalidate disabled: REVALIDATE_SECRET is not set" }, { status: 503 });
  }

  if (!secret || secret !== expectedSecret) {
    return NextResponse.json({ ok: false, error: "Unauthorized: Invalid or missing secret token" }, { status: 401 });
  }

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
