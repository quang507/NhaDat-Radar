import { NextResponse } from "next/server";

export const revalidate = 86400; // cache 1 ngày

export async function GET() {
  const rawId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || process.env.ADSENSE_PUB_ID || "";
  // Tách lấy phần số hoặc pub-XXXXXXXXXXXX
  const pubMatch = rawId.match(/pub-\d+/i) || rawId.match(/\d{10,20}/);
  const pubId = pubMatch ? (pubMatch[0].startsWith("pub-") ? pubMatch[0] : `pub-${pubMatch[0]}`) : "pub-0000000000000000";

  const content = [
    "# Google AdSense nhadatradar.com",
    `google.com, ${pubId}, DIRECT, f08c47fec0942fa0`,
    "",
  ].join("\n");

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, s-maxage=86400",
    },
  });
}
