// Sitemap tin cũ: trả 410 Gone (Hướng B: không còn cấp sitemap trang tin cho bot cào)
export const revalidate = 86400;

export async function GET() {
  return new Response("Gone", {
    status: 410,
    headers: { "Cache-Control": "public, max-age=86400" },
  });
}
