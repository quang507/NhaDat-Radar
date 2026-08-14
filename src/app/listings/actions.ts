"use server";

import { createClient } from "@/lib/supabase/server";

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
