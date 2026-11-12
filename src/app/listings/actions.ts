"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { baoLeadMoi } from "@/lib/bao-lead";
import { ghiSuKien } from "@/lib/su-kien";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/supabase/anon";
import { REPORT_REASONS } from "@/lib/reports";
import { xuLyPhienSdt } from "@/app/auth/actions";
import { chuanHoaSdt, HOTLINE, SDT_RE } from "@/lib/hotline";
import { laRoHang } from "@/lib/ro-hang";
import { laTinDocQuyen } from "@/lib/doc-quyen";

// audit 16/8: 2 form công khai (anon insert) chưa có giới hạn -> 1 IP có thể spam bảng leads/listing_reports
async function tooMany(bucket: string, max: number): Promise<boolean> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") || h.get("x-real-ip") || "?").split(",")[0].trim();
  return !rateLimit(`${bucket}:${ip}`, max, 10 * 60 * 1000);
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// v: giá trị khách đã gõ - React 19 reset form sau action, báo lỗi xong form phải tự điền lại (audit Q7)
export type LeadState = { ok: boolean; error?: string; v?: Record<string, string> };

// Gửi liên hệ từ form trang chi tiết -> bảng leads.
// 2/11 (audit S3): leads không còn cho anon insert qua REST (migration 038) -> ghi bằng service role SAU khi kiểm input.
export async function createLead(
  _prev: LeadState,
  formData: FormData,
): Promise<LeadState> {
  const listing_id = String(formData.get("listing_id") || "");
  const project_id = String(formData.get("project_id") || "");
  const name = String(formData.get("name") || "").trim();
  const phoneGo = String(formData.get("phone") || "").trim();
  const phone = chuanHoaSdt(phoneGo);
  const loiNhan = String(formData.get("message") || "").trim();
  let message = loiNhan;
  // form "Đặt lịch xem phòng" (rổ hàng Radar): bảng leads không có cột lịch -> ghép vào đầu lời nhắn
  const henNgay = String(formData.get("hen_ngay") || "").slice(0, 10), henBuoi = String(formData.get("hen_buoi") || "").slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(henNgay)) message = `[HẸN XEM ${henBuoi} ${henNgay.split("-").reverse().join("/")}] ${message}`.trim();
  const v = { name: name.slice(0, 120), phone: phoneGo.slice(0, 30), message: loiNhan.slice(0, 2000), hen_ngay: henNgay, hen_buoi: henBuoi };
  if (!name || !phone) return { ok: false, error: "Nhập tên và số điện thoại.", v };
  // id rác -> lỗi Postgres 22P02 lúc insert (khách chỉ thấy "không gửi được"); chặn sớm, báo rõ
  if ((listing_id && !UUID_RE.test(listing_id)) || (project_id && !UUID_RE.test(project_id))) return { ok: false, error: "Tin đăng không hợp lệ.", v };
  if (name.length > 120 || message.length > 2000) return { ok: false, error: "Tên tối đa 120 ký tự, lời nhắn tối đa 2000 ký tự.", v };
  if (!SDT_RE.test(phone)) return { ok: false, error: "Số điện thoại chưa đúng (VD: 0912 345 678).", v };
  if (await tooMany("lead", 8)) return { ok: false, error: "Bạn gửi hơi nhanh - thử lại sau ít phút.", v };

  // Chỉ thêm project_id khi có (tránh lỗi nếu migration 004 chưa chạy trên DB).
  const row: Record<string, unknown> = { listing_id: listing_id || null, name, phone, message };
  if (project_id) row.project_id = project_id;
  const { error } = await createAdminClient().from("leads").insert(row);
  if (error) {
    console.error("createLead error:", error.message); // không rò chi tiết Postgres ra client
    return { ok: false, error: "Không gửi được liên hệ, vui lòng thử lại.", v };
  }
  // báo admin qua email SAU khi trả kết quả cho khách (after): khách không phải chờ Resend,
  // gửi lỗi cũng không ảnh hưởng - lead đã nằm trong DB
  after(() => baoLeadMoi({ listing_id: listing_id || null, name, phone, message }));
  after(() => ghiSuKien({ loai: "dat_lich", listingId: listing_id || null }));
  return { ok: true };
}

export type MoKhoaSdtState = {
  ok: boolean;
  error?: string;
  phone?: string | null;
  zaloPhone?: string | null;
  isRadar?: boolean;
  overLimit?: boolean;
};

/**
 * Popup "Để lại SĐT" (kiểu Batdongsan, không OTP):
 * - Khách chưa đăng nhập nhập SĐT -> lưu leads, tạo/đăng nhập tài khoản khách (`@sdt.nhadatradar.local`)
 * - Tin của Radar (rổ hàng + FB/Zalo độc quyền) -> trả hotline Radar (0387365020)
 * - Tin crawl web / tự đăng -> mở SĐT người đăng gốc qua RPC lay_sdt_tin (giới hạn 30 tin/ngày)
 */
export async function moKhoaLienHeSdt(input: {
  listingId: string;
  phone?: string;
  intent: "phone" | "zalo";
}): Promise<MoKhoaSdtState> {
  const listingId = String(input?.listingId || "");
  if (!UUID_RE.test(listingId)) return { ok: false, error: "Tin đăng không hợp lệ." };
  if (await tooMany("lead", 12)) return { ok: false, error: "Bạn thao tác hơi nhanh - thử lại sau ít phút." };

  const admin = createAdminClient();
  const { data: tin } = await admin
    .from("listings")
    .select("id, source, source_site, contact_phone, status")
    .eq("id", listingId)
    .maybeSingle();
  if (!tin || tin.status !== "published") {
    return { ok: false, error: "Tin đăng không còn khả dụng." };
  }

  const supabase = await createClient();
  const { data: { user: curUser } } = await supabase.auth.getUser();
  let accessToken: string | null = null;
  let leadPhone: string | null = null;

  if (!curUser) {
    const kq = await xuLyPhienSdt(String(input?.phone || ""));
    if (!kq.ok) return { ok: false, error: kq.error };
    accessToken = kq.accessToken;
    leadPhone = kq.sdt;
  } else if (input?.phone) {
    const clean = chuanHoaSdt(input.phone);
    if (SDT_RE.test(clean)) leadPhone = clean;
  }

  const isRadar = laRoHang(tin) || laTinDocQuyen(tin);

  if (leadPhone) {
    const intentLabel = input.intent === "zalo" ? "Chat qua Zalo" : "Hiện số";
    const msg = isRadar
      ? `Khách bấm '${intentLabel}' tin Radar & để lại SĐT - gọi lại tư vấn/hẹn xem`
      : `Khách bấm '${intentLabel}' tin ${tin.source_site || "web"} & để lại SĐT xem số gốc`;
    const row = { listing_id: listingId, name: "Khách xem số / Zalo", phone: leadPhone, message: msg };
    const { error: lErr } = await admin.from("leads").insert(row);
    if (!lErr) {
      after(() => baoLeadMoi({ listing_id: listingId, name: row.name, phone: leadPhone!, message: msg }));
    }
    after(() => ghiSuKien({ loai: input.intent === "zalo" ? "zalo" : "dat_lich", listingId }));
  }

  if (isRadar) {
    return { ok: true, phone: HOTLINE, zaloPhone: HOTLINE, isRadar: true };
  }

  if (!tin.contact_phone) {
    return { ok: true, phone: null, zaloPhone: null, isRadar: false };
  }

  const authedClient = accessToken
    ? createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : supabase;

  const rpc = await authedClient.rpc("lay_sdt_tin", { p_listing: listingId });
  if (rpc.error?.message?.includes("qua_gioi_han_xem_sdt")) {
    return { ok: true, phone: null, zaloPhone: null, overLimit: true, isRadar: false };
  }
  const phone = !rpc.error ? ((rpc.data as string | null) ?? null) : null;
  const cleanPhone = chuanHoaSdt(phone);
  return {
    ok: true,
    phone,
    zaloPhone: SDT_RE.test(cleanPhone) ? cleanPhone : null,
    isRadar: false,
  };
}

/**
 * "Bấm để hiện số" (2/10): khách chưa đăng nhập nhập SĐT để xem hotline Radar -> 1 lead (không cần tên).
 * Thay form đặt lịch nhiều ô (tên, ngày, buổi...) - ít ô hơn = nhiều khách để lại số hơn.
 */
export async function deLaiSdt(listingId: string | null, phone: string): Promise<LeadState> {
  const sdt = chuanHoaSdt(String(phone || ""));
  if (!SDT_RE.test(sdt)) return { ok: false, error: "Số điện thoại chưa đúng (VD: 0912 345 678)." };
  const lid = listingId && UUID_RE.test(listingId) ? listingId : null;
  if (await tooMany("lead", 8)) return { ok: false, error: "Bạn gửi hơi nhanh - thử lại sau ít phút." };
  const row = { listing_id: lid, name: "Khách bấm hiện số", phone: sdt, message: "Bấm 'hiện số' hotline Radar - gọi lại tư vấn/hẹn xem" };
  const { error } = await createAdminClient().from("leads").insert(row);
  if (error) { console.error("deLaiSdt error:", error.message); return { ok: false, error: "Chưa gửi được, thử lại giúp Radar." }; }
  after(() => baoLeadMoi({ listing_id: lid, name: row.name, phone: sdt, message: row.message }));
  after(() => ghiSuKien({ loai: "dat_lich", listingId: lid }));
  return { ok: true };
}

/**
 * 2/11 (audit S3): lead nhanh cho component phía trình duyệt (popup để lại SĐT, form nhận tin nhà giá tốt) -
 * trước đó chúng insert thẳng bảng leads bằng supabase client, sau 038 sẽ bị RLS chặn.
 */
export async function guiLeadNhanh(input: { name?: string; phone: string; message?: string }): Promise<LeadState> {
  const sdt = chuanHoaSdt(String(input?.phone || ""));
  if (!SDT_RE.test(sdt)) return { ok: false, error: "Số điện thoại chưa đúng (VD: 0912 345 678)." };
  const name = String(input?.name || "").trim().slice(0, 120) || "Khách để lại SĐT";
  const message = String(input?.message || "").trim().slice(0, 1000);
  if (await tooMany("lead", 8)) return { ok: false, error: "Bạn gửi hơi nhanh - thử lại sau ít phút." };
  const { error } = await createAdminClient().from("leads").insert({ listing_id: null, name, phone: sdt, message });
  if (error) { console.error("guiLeadNhanh error:", error.message); return { ok: false, error: "Chưa gửi được, thử lại giúp Radar." }; }
  after(() => baoLeadMoi({ listing_id: null, name, phone: sdt, message }));
  return { ok: true };
}

// Báo tin xấu -> bảng listing_reports. Admin xử lý ở /admin?tab=reports.
// 2/11 (audit S3): ghi bằng service role sau khi kiểm input; reporter_id vẫn lấy từ phiên đăng nhập (không tin form)
export async function reportListing(_prev: LeadState, formData: FormData): Promise<LeadState> {
  const listing_id = String(formData.get("listing_id") || "");
  const reason = String(formData.get("reason") || "");
  const detail = String(formData.get("detail") || "").trim().slice(0, 500);
  const v = { reason, detail };
  if (!UUID_RE.test(listing_id) || !REPORT_REASONS[reason]) return { ok: false, error: "Chọn lý do báo cáo.", v };
  if (reason === "khac" && detail.length < 10) return { ok: false, error: "Mô tả thêm giúp Radar xử lý đúng (≥10 ký tự).", v };
  if (await tooMany("report", 10)) return { ok: false, error: "Bạn báo cáo hơi nhanh - thử lại sau ít phút.", v };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await createAdminClient().from("listing_reports").insert({ listing_id, reason, detail: detail || null, reporter_id: user?.id ?? null });
  if (error) {
    console.error("reportListing error:", error.message);
    return { ok: false, error: "Không gửi được, vui lòng thử lại.", v };
  }
  return { ok: true };
}
