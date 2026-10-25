import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { khoangIdTuMa } from "@/lib/ro-hang";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const rawCode = (code || "").trim();
  const khoang = khoangIdTuMa(rawCode);

  if (!khoang) {
    return NextResponse.redirect(new URL(`/search?q=${encodeURIComponent(rawCode)}`, request.url));
  }

  const admin = createAdminClient();
  const { data: listing } = await admin
    .from("listings")
    .select("id")
    .gte("id", khoang[0])
    .lte("id", khoang[1])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (listing?.id) {
    return NextResponse.redirect(new URL(`/listings/${listing.id}`, request.url));
  }

  return NextResponse.redirect(new URL(`/search?q=${encodeURIComponent(rawCode)}`, request.url));
}
