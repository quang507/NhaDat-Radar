"use server";

import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/supabase/anon";
import { REPORT_REASONS } from "@/lib/reports";

// audit 16/8: 2 form công khai (anon insert) chưa có giới hạn -> 1 IP có thể spam bảng leads/listing_reports
async function tooMany(bucket: string, max: number): Promise<boolean> {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") || h.get("x-real-ip") || "?").split(",")[0].trim();
  return !rateLimit(`${bucket}:${ip}`, max, 10 * 60 * 1000);
}
const PHONE_RE = /^(\+84|0)\d{8,10}$/;

export type LeadState = { ok: boolean; error?: string };

// Gửi liên hệ từ form trang chi tiết -> bảng leads (anon insert được phép qua RLS).
export async function createLead(
  _prev: LeadState,
  formData: FormData,
): Promise<LeadState> {
  const listing_id = String(formData.get("listing_id") || "");
  const project_id = String(formData.get("project_id") || "");
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const message = String(formData.get("message") || "").trim();
  if (!name || !phone) return { ok: false, error: "Nhập tên và số điện thoại." };
  if (!PHONE_RE.test(phone.replace(/[\s.-]/g, ""))) return { ok: false, error: "Số điện thoại chưa đúng (VD: 0912 345 678)." };
  if (await tooMany("lead", 8)) return { ok: false, error: "Bạn gửi hơi nhanh — thử lại sau ít phút." };

  const supabase = await createClient();
  // Chỉ thêm project_id khi có (tránh lỗi nếu migration 004 chưa chạy trên DB).
  const row: Record<string, unknown> = { listing_id: listing_id || null, name, phone, message };
  if (project_id) row.project_id = project_id;
  const { error } = await supabase.from("leads").insert(row);
  if (error) {
    console.error("createLead error:", error.message); // không rò chi tiết Postgres ra client
    return { ok: false, error: "Không gửi được liên hệ, vui lòng thử lại." };
  }
  return { ok: true };
}

// Báo tin xấu -> bảng listing_reports (anon insert được phép qua RLS, migration 010). Admin xử lý ở /admin?tab=reports.
export async function reportListing(_prev: LeadState, formData: FormData): Promise<LeadState> {
  const listing_id = String(formData.get("listing_id") || "");
  const reason = String(formData.get("reason") || "");
  const detail = String(formData.get("detail") || "").trim().slice(0, 500);
  if (!listing_id || !REPORT_REASONS[reason]) return { ok: false, error: "Chọn lý do báo cáo." };
  if (reason === "khac" && detail.length < 10) return { ok: false, error: "Mô tả thêm giúp Radar xử lý đúng (≥10 ký tự)." };
  if (await tooMany("report", 10)) return { ok: false, error: "Bạn báo cáo hơi nhanh — thử lại sau ít phút." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("listing_reports").insert({ listing_id, reason, detail: detail || null, reporter_id: user?.id ?? null });
  if (error) {
    console.error("reportListing error:", error.message);
    return { ok: false, error: "Không gửi được, vui lòng thử lại." };
  }
  return { ok: true };
}
