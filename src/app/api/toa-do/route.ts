import { NextResponse } from "next/server";
import { toaDoTuLink, laHostMaps } from "@/lib/maps-link";

// Link Google Maps rút gọn (maps.app.goo.gl/...) không chứa toạ độ -> theo redirect (tối đa 4 bước,
// chỉ trong host Google) rồi đọc toạ độ từ URL đích. Link dài có toạ độ thì client tự đọc, không gọi đây.
export async function GET(req: Request) {
  let url = new URL(req.url).searchParams.get("url") || "";
  const tuc = toaDoTuLink(url);
  if (tuc) return NextResponse.json(tuc);
  for (let i = 0; i < 4; i++) {
    let u: URL;
    try { u = new URL(url); } catch { break; }
    if (u.protocol !== "https:" || !laHostMaps(u.hostname)) break;
    const res = await fetch(u, { redirect: "manual", signal: AbortSignal.timeout(5000) }).catch(() => null);
    const toi = res?.headers.get("location");
    if (!toi) {
      // trang đích không redirect nữa: toạ độ đôi khi nằm trong HTML (meta / APP_INITIALIZATION_STATE)
      const html = res ? await res.text().catch(() => "") : "";
      const m = html.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || html.match(/\[null,null,(-?\d+\.\d+),(-?\d+\.\d+)\]/);
      return m ? NextResponse.json({ lat: Number(m[1]), lng: Number(m[2]) }) : NextResponse.json({ loi: "Không đọc được toạ độ từ link" }, { status: 422 });
    }
    url = new URL(toi, u).toString();
    const kq = toaDoTuLink(url);
    if (kq) return NextResponse.json(kq);
  }
  return NextResponse.json({ loi: "Link không phải Google Maps hoặc không có toạ độ" }, { status: 422 });
}
