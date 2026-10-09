import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

export async function GET(req: NextRequest) {
  try {
    revalidatePath("/", "page");
    revalidatePath("/search", "page");
    revalidateTag("areas");
    revalidateTag("listings");
    return NextResponse.json({ ok: true, message: "Revalidated cache successfully", timestamp: new Date().toISOString() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
