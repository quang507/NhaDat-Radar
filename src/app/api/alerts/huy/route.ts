import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Hủy đăng ký email tin mới - link trong footer mail (21/8: mail hứa "hủy được ngay trong
// email" từ ngày đầu mà không hề có nút).
//
// GET chỉ HIỆN trang xác nhận, POST mới thật sự hủy: máy quét link của Gmail/Outlook tự
// mở mọi URL trong mail - nếu GET mà hủy luôn thì người ta chưa kịp đọc đã bị hủy oan.
// Hủy = active=false chứ không xoá hàng: còn xem và quản lý được trong Supabase, người
// dùng đổi ý thì bấm 🔔 đăng ký lại như thường.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function trang(than: string, tieuDe = "NhaDat Radar") {
  return new NextResponse(
    `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${tieuDe}</title></head>
<body style="font-family:system-ui,sans-serif;background:#f4f7f5;margin:0;display:grid;place-items:center;min-height:100vh">
<div style="background:#fff;border:1px solid #dbe4de;border-radius:12px;padding:32px;max-width:420px;margin:16px;text-align:center">
<div style="font-weight:800;color:#0e7a4f;margin-bottom:12px">NhaDat Radar</div>${than}
</div></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

function docThamSo(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id") || "";
  const t = req.nextUrl.searchParams.get("t") || "";
  return UUID.test(id) && UUID.test(t) ? { id, t } : null;
}

export async function GET(req: NextRequest) {
  const p = docThamSo(req);
  if (!p) return trang("<p>Link hủy không hợp lệ.</p>");
  return trang(
    `<p>Ngừng nhận email báo tin mới cho bộ lọc này?</p>
     <form method="post" action="/api/alerts/huy?id=${p.id}&t=${p.t}">
       <button type="submit" style="background:#0e7a4f;color:#fff;border:0;border-radius:8px;padding:10px 22px;font-weight:700;font-size:15px;cursor:pointer">Hủy đăng ký</button>
     </form>
     <p style="color:#8a9a90;font-size:13px;margin-top:14px">Đổi ý thì bấm 🔔 trên trang tìm kiếm để đăng ký lại.</p>`,
    "Hủy đăng ký email - NhaDat Radar",
  );
}

export async function POST(req: NextRequest) {
  const p = docThamSo(req);
  if (!p) return trang("<p>Link hủy không hợp lệ.</p>");
  const sb = createAdminClient();
  const { data, error } = await sb.from("saved_searches")
    .update({ active: false }).eq("id", p.id).eq("unsub_token", p.t).select("id");
  if (error) { console.error("alerts/huy:", error.message); return trang("<p>Có lỗi, thử lại sau ít phút.</p>"); }
  return trang(
    data?.length
      ? "<p>✅ Đã hủy đăng ký. Bạn sẽ không nhận thêm email cho bộ lọc này.</p><p style='color:#8a9a90;font-size:13px'>Đăng ký lại bất cứ lúc nào bằng nút 🔔 trên trang tìm kiếm.</p>"
      : "<p>Link không đúng hoặc bộ lọc này đã được hủy trước đó.</p>",
    "Đã hủy đăng ký - NhaDat Radar",
  );
}
