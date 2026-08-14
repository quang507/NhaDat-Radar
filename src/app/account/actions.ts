"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");

  let avatar_url: string | null = null;
  try {
    const arr = JSON.parse(String(formData.get("avatar") || "[]"));
    if (Array.isArray(arr) && typeof arr[0] === "string") avatar_url = arr[0];
  } catch { /* giữ avatar cũ */ }

  const patch: Record<string, unknown> = {
    full_name: String(formData.get("full_name") || "").trim().slice(0, 120) || null,
    phone: String(formData.get("phone") || "").trim().slice(0, 30) || null,
    agency_name: String(formData.get("agency_name") || "").trim().slice(0, 160) || null,
    license_no: String(formData.get("license_no") || "").trim().slice(0, 80) || null,
    bio: String(formData.get("bio") || "").trim().slice(0, 1000) || null,
    years_experience: Math.max(0, Math.min(60, Number(formData.get("years_experience") || 0))),
    specialties: String(formData.get("specialties") || "")
      .split(",").map((s) => s.trim()).filter(Boolean).slice(0, 8),
    languages: String(formData.get("languages") || "")
      .split(",").map((s) => s.trim()).filter(Boolean).slice(0, 8),
  };
  if (avatar_url) patch.avatar_url = avatar_url;

  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) redirect("/account?error=" + encodeURIComponent(error.message));
  revalidatePath("/account");
  revalidatePath("/agents");
  redirect("/account?message=" + encodeURIComponent("Đã lưu hồ sơ!"));
}
