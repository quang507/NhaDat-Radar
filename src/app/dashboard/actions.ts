"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  const { error } = await supabase.from("listings").insert({
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
    ai_score: 90,
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
  await supabase.from("appointments").update({ status })
    .eq("id", id)
    .or(`agent_id.eq.${user.id},buyer_id.eq.${user.id}`);
  revalidatePath("/dashboard");
}
