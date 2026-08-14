"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type ListingState = { ok: boolean; error?: string };

export async function createListing(
  _prev: ListingState,
  formData: FormData,
): Promise<ListingState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  const title = String(formData.get("title") || "").trim();
  const price = Number(formData.get("price") || 0);
  if (!title || !price) return { ok: false, error: "Cần tiêu đề và giá." };

  const area = Number(formData.get("area") || 0) || null;
  const amenities = formData.getAll("amenities").map(String);
  let images: string[] = [];
  try {
    const arr = JSON.parse(String(formData.get("images") || "[]"));
    if (Array.isArray(arr)) images = arr.filter((u) => typeof u === "string" && u.startsWith("http")).slice(0, 12);
  } catch { /* không có ảnh */ }

  // Ghi bằng service-role SAU KHI đã xác thực user + ép agent_id = user.id.
  // Client thường không được insert listings nữa (migration 005 gỡ policy insert),
  // để không ai gọi thẳng PostgREST tự đặt status/ai_score/trust_score giả.
  const { error } = await createAdminClient().from("listings").insert({
    source: "agent",
    agent_id: user.id,
    deal: String(formData.get("deal") || "ban"),
    kind: String(formData.get("kind") || "nha"),
    title,
    description: String(formData.get("description") || ""),
    price_vnd: price,
    area_m2: area,
    bedrooms: Number(formData.get("bedrooms") || 0) || null,
    bathrooms: Number(formData.get("bathrooms") || 0) || null,
    floors: Number(formData.get("floors") || 0) || null,
    direction: String(formData.get("direction") || "") || null,
    legal_status: String(formData.get("legal_status") || "") || null,
    furnishing: String(formData.get("furnishing") || "") || null,
    province: String(formData.get("province") || "") || null,
    district: String(formData.get("district") || "") || null,
    address: String(formData.get("address") || "") || null,
    contact_name: String(formData.get("contact_name") || "") || null,
    contact_phone: String(formData.get("contact_phone") || "") || null,
    amenities,
    images,
    // Điểm tính từ độ đầy đủ tin thật (trước đây gán cứng 90 cho mọi tin tự đăng)
    ai_score: (() => {
      let s = 62;
      if (images.length >= 3) s += 9; else if (images.length) s += 4;
      if (formData.get("legal_status")) s += 7;
      if (String(formData.get("description") || "").length > 200) s += 6;
      if (area) s += 4;
      if (Number(formData.get("bedrooms"))) s += 3;
      return Math.min(92, s);
    })(),
    poster_role_guess: "agent",
    status: "published",
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard");
  revalidatePath("/");
  redirect("/dashboard");
}

// Người bán xác nhận/từ chối, hoặc bên nào cũng hủy được lịch hẹn.
// RLS (appt_participants) chỉ cho buyer/agent của lịch đó update — an toàn.
export async function setAppointmentStatus(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");
  if (!id || !["confirmed", "cancelled", "requested"].includes(status)) return;
  let q = supabase.from("appointments").update({ status }).eq("id", id);
  // Chỉ NGƯỜI BÁN được "xác nhận"; "hủy"/khác thì cả hai bên đều được.
  q = status === "confirmed"
    ? q.eq("agent_id", user.id)
    : q.or(`agent_id.eq.${user.id},buyer_id.eq.${user.id}`);
  await q;
  revalidatePath("/dashboard");
}
