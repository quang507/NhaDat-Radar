import { NextRequest } from "next/server";
import { catWatermark, NGUON_HF } from "@/lib/che-watermark";

// Ảnh rổ hàng HiFriendz qua /m/h/<tên file> (crawler/che-media.mjs, 3/11): lấy từ nguồn, cắt logo đối tác
// (lib/che-watermark), trả kèm cache CDN 1 năm - mỗi ảnh chỉ xử lý một lần mỗi vùng CDN.
// Video (.mp4...) không vào đây: rewrites beforeFiles trong next.config.mjs chuyển thẳng về nguồn.
// Chỉ nhận đúng thư mục ảnh của đối tác + token hợp lệ: không thành proxy ảnh công cộng.
const CACHE = "public, max-age=31536000, immutable";

export async function GET(req: NextRequest, { params }: { params: Promise<{ f: string }> }) {
  const { f } = await params;
  const token = req.nextUrl.searchParams.get("token") || "";
  if (!/^[\w .()-]+\.(jpe?g|png|webp)$/i.test(f) || !/^[\w-]{10,64}$/.test(token)) return new Response("Not found", { status: 404 });

  const goc = await fetch(`${NGUON_HF}${encodeURIComponent(f)}?alt=media&token=${token}`, { cache: "no-store" });
  if (!goc.ok) return new Response("Not found", { status: goc.status === 403 || goc.status === 404 ? 404 : 502 });
  const buf = Buffer.from(await goc.arrayBuffer());

  let anh: Buffer, loai = "image/jpeg";
  try {
    anh = await catWatermark(buf);
  } catch (e) {
    console.error("[m/h] cắt logo lỗi, trả ảnh gốc:", f, e);
    anh = buf; loai = goc.headers.get("content-type") || loai;
  }
  return new Response(new Uint8Array(anh), { headers: { "Content-Type": loai, "Cache-Control": CACHE, "CDN-Cache-Control": CACHE } });
}
