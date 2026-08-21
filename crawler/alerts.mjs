// Email báo tin mới: quét saved_searches -> tìm tin published mới khớp -> gửi mail qua Resend.
// Chạy sau seed trong daily.mjs. Cần: SUPABASE service role + RESEND_API_KEY (thiếu key -> bỏ qua êm).
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const RESEND = process.env.RESEND_API_KEY;
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://nhadatradar.com";
const FROM = process.env.ALERT_FROM || "NhaDat Radar <onboarding@resend.dev>";

if (!url || !key) { console.error("alerts: thiếu SUPABASE env"); process.exit(0); }
if (!RESEND) { console.log("alerts: chưa có RESEND_API_KEY -> bỏ qua gửi mail."); process.exit(0); }

const sb = createClient(url, key, { auth: { persistSession: false } });
const fmtPrice = (v) => !v ? "TL" : v >= 1e9 ? (v / 1e9).toFixed(1).replace(/\.0$/, "") + " tỷ" : Math.round(v / 1e6) + " triệu";

const { data: searches } = await sb.from("saved_searches").select("*").eq("active", true).limit(500);
let sent = 0;
for (const s of searches ?? []) {
  if (!s.email) continue;
  const since = s.last_notified_at || s.created_at;
  let q = sb.from("listings").select("id,title,price_vnd,deal,district,province,area_m2")
    .eq("status", "published").gt("first_seen_at", since).limit(10);
  if (s.deal) q = q.eq("deal", s.deal);
  if (s.kind) q = q.eq("kind", s.kind);
  if (s.province) q = q.ilike("province", `%${s.province}%`);
  // district so KHỚP CHÍNH XÁC như trang /search (DB đã chuẩn hoá qua canonDistrict):
  // substring thì "Quận 1" ăn cả Quận 10/11/12 - email trả tin mà vào web cùng bộ lọc lại
  // không thấy, hai bên tự mâu thuẫn. ward thì DB ghi tự do nên vẫn khớp mềm, cùng /search.
  if (s.district) q = q.eq("district", s.district);
  if (s.ward) q = q.ilike("ward", `%${s.ward}%`);
  if (s.price_min) q = q.gte("price_vnd", s.price_min);
  if (s.price_max) q = q.lte("price_vnd", s.price_max);
  if (s.area_min) q = q.gte("area_m2", s.area_min);
  const { data: hits } = await q;
  if (!hits?.length) continue;

  // escape HTML: tiêu đề/địa danh là dữ liệu CÀO từ ngoài, không được nội suy thẳng vào email (audit 16/8)
  const esc = (s) => String(s ?? "").replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const rows = hits.map((h) =>
    `<li style="margin-bottom:8px"><a href="${SITE}/listings/${h.id}" style="color:#2563eb;font-weight:600">${esc(h.title)}</a><br>
     <span style="color:#555;font-size:13px">${fmtPrice(h.price_vnd)}${h.deal === "cho_thue" ? "/tháng" : ""}${h.area_m2 ? ` · ${h.area_m2}m²` : ""} · ${esc([h.district, h.province].filter(Boolean).join(", "))}</span></li>`
  ).join("");
  // nhãn tiếng Việt như popup đăng ký, không phơi mã enum "can_ho" ra subject email
  const KIND_VN = { nha: "Nhà", dat: "Đất", can_ho: "Căn hộ", mat_bang: "Mặt bằng", phong_tro: "Phòng trọ", khac: "BĐS khác" };
  const criteria = [s.kind ? KIND_VN[s.kind] || s.kind : null, s.deal === "ban" ? "bán" : s.deal === "cho_thue" ? "cho thuê" : null, s.ward, s.district, s.province].filter(Boolean).join(" · ") || "tất cả";

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  const res = await fetch("https://api.resend.com/emails", {
    signal: ctrl.signal,
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM, to: [s.email],
      subject: `🏠 ${hits.length} tin mới khớp tìm kiếm của bạn (${criteria})`,
      html: `<div style="font-family:sans-serif;max-width:560px">
        <h2 style="color:#2563eb">NhaDat Radar - tin mới cho bạn</h2>
        <p>Bộ lọc: <b>${criteria}</b></p><ul style="padding-left:18px">${rows}</ul>
        <p><a href="${SITE}/search" style="color:#2563eb">Xem thêm trên NhaDat Radar →</a></p>
        <p style="color:#999;font-size:12px">Bạn nhận mail này vì đã bấm 🔔 trên trang tìm kiếm.</p></div>`,
    }),
  });
  clearTimeout(timer);
  if (res.ok) {
    sent++;
    await sb.from("saved_searches").update({ last_notified_at: new Date().toISOString() }).eq("id", s.id);
  } else {
    console.error("alerts: gửi lỗi", s.email, res.status, await res.text().catch(() => ""));
  }
}
console.log(`alerts: đã gửi ${sent}/${searches?.length ?? 0} email.`);
