// SERVER-ONLY: báo admin qua email khi có khách để lại liên hệ / đặt lịch xem phòng (30/9).
// Trước đây form chỉ ghi bảng leads - admin phải tự mở /admin?tab=leads mới biết có khách.
//
// Gửi bằng Resend (RESEND_API_KEY đã có trên Vercel, dùng chung với email báo tin mới crawler/alerts.mjs).
// Người gửi mặc định onboarding@resend.dev chỉ giao được tới email CHỦ tài khoản Resend -> mặc định gửi
// về Gmail admin; đổi bằng LEAD_NOTIFY_EMAIL (nhiều địa chỉ ngăn bởi dấu phẩy), ALERT_FROM khi đã
// xác minh tên miền. Lỗi gửi chỉ log, KHÔNG làm hỏng form của khách (lead đã lưu DB trước đó).
import { createAdminClient } from "@/lib/supabase/admin";
import { fmtPrice } from "@/lib/format";
import { laRoHang, maPhong } from "@/lib/ro-hang";
import { SITE_URL } from "@/lib/ld";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export type LeadMoi = { listing_id: string | null; name: string; phone: string; message: string };

export async function baoLeadMoi(lead: LeadMoi): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) { console.warn("baoLeadMoi: thiếu RESEND_API_KEY - bỏ qua email"); return; }
  const to = (process.env.LEAD_NOTIFY_EMAIL || "quanggooner1996@gmail.com").split(",").map((s) => s.trim()).filter(Boolean);

  // Thông tin tin đăng + phần RIÊNG của rổ hàng (địa chỉ thật, mã căn, hoa hồng - chỉ admin đọc được,
  // nên dùng service role; email chỉ tới admin)
  let tin: { id: string; title: string; price_vnd: number | null; deal: string; district: string | null; source: string | null; source_site: string | null } | null = null;
  let rieng: { exact_address: string | null; unit_code: string | null; commission: string | null } | null = null;
  if (lead.listing_id) {
    const sb = createAdminClient();
    const [{ data: t }, { data: r }] = await Promise.all([
      sb.from("listings").select("id,title,price_vnd,deal,district,source,source_site").eq("id", lead.listing_id).maybeSingle(),
      sb.from("listing_ro_hang").select("exact_address,unit_code,commission").eq("listing_id", lead.listing_id).maybeSingle(),
    ]);
    tin = t; rieng = r;
  }
  const roHang = tin ? laRoHang(tin) : false;
  const hen = lead.message.match(/^\[HẸN XEM ([^\]]+)\]/)?.[1];   // createLead ghép "[HẸN XEM Chiều 30/09/2026]"
  const loiNhan = lead.message.replace(/^\[HẸN XEM [^\]]+\]\s*/, "");
  const sdt = lead.phone.replace(/[\s.-]/g, "");

  const dong = (k: string, v: string | null | undefined) => (v ? `<tr><td style="padding:4px 12px 4px 0;color:#666;white-space:nowrap">${k}</td><td style="padding:4px 0"><b>${v}</b></td></tr>` : "");
  const html = `<div style="font-family:sans-serif;max-width:560px">
    <h2 style="margin:0 0 4px;color:#1f7a4d">${hen ? "📅 Khách đặt lịch xem phòng" : "💬 Khách để lại liên hệ"}</h2>
    <p style="margin:0 0 12px;color:#666">${esc(new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }))}</p>
    <table style="border-collapse:collapse;font-size:15px">
      ${dong("Khách", esc(lead.name))}
      ${dong("SĐT", `<a href="tel:${esc(sdt)}">${esc(lead.phone)}</a> · <a href="https://zalo.me/${esc(sdt)}">Zalo</a>`)}
      ${dong("Hẹn xem", hen ? esc(hen) : null)}
      ${dong("Lời nhắn", loiNhan ? esc(loiNhan) : null)}
      ${tin ? dong("Tin", `<a href="${SITE_URL}/listings/${tin.id}">${esc(tin.title)}</a>`) : ""}
      ${tin ? dong("Giá", esc(fmtPrice(tin.price_vnd, tin.deal))) : ""}
      ${roHang && tin ? dong("Mã phòng", esc(maPhong(tin.id))) : ""}
      ${dong("🔒 Địa chỉ thật", rieng?.exact_address ? esc(rieng.exact_address) : null)}
      ${dong("🔒 Mã căn", rieng?.unit_code ? esc(rieng.unit_code) : null)}
      ${dong("🔒 Hoa hồng", rieng?.commission ? esc(rieng.commission) : null)}
      ${tin && !roHang ? dong("Nguồn", esc(tin.source_site || tin.source)) : ""}
    </table>
    <p style="margin-top:16px"><a href="${SITE_URL}/admin?tab=leads" style="color:#1f7a4d">Mở danh sách khách trong admin →</a></p>
  </div>`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST", signal: ctrl.signal,
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.ALERT_FROM || "NhaDat Radar <onboarding@resend.dev>",
        to,
        subject: `${hen ? "📅 Hẹn xem" : "💬 Khách mới"}: ${lead.name} · ${sdt}${roHang && tin ? ` · ${maPhong(tin.id)}` : ""}${hen ? ` · ${hen}` : ""}`,
        html,
      }),
    });
    if (!res.ok) console.error("baoLeadMoi: Resend", res.status, (await res.text()).slice(0, 300));
  } catch (e) {
    console.error("baoLeadMoi:", e instanceof Error ? e.message : e);
  } finally {
    clearTimeout(timer);
  }
}
