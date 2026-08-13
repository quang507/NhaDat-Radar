"use server";

import { createClient } from "@/lib/supabase/server";

export type LeadState = { ok: boolean; error?: string };

// Gửi liên hệ từ form trang chi tiết -> bảng leads (anon insert được phép qua RLS).
export async function createLead(
  _prev: LeadState,
  formData: FormData,
): Promise<LeadState> {
  const listing_id = String(formData.get("listing_id") || "");
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const message = String(formData.get("message") || "").trim();
  if (!name || !phone) return { ok: false, error: "Nhập tên và số điện thoại." };

  const supabase = await createClient();
  const { error } = await supabase.from("leads").insert({
    listing_id: listing_id || null,
    name,
    phone,
    message,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
