"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Chỉ admin: cột status bị khoá với client thường (migration 001) nên dùng service role SAU KHI xác minh quyền.
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  const { data: p } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (p?.role !== "admin") redirect("/?");
}

export async function setListingStatus(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");
  if (!id || !["published", "hidden", "rejected"].includes(status)) return;
  await createAdminClient().from("listings").update({ status }).eq("id", id);
  revalidatePath("/admin");
}

export async function deleteListing(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  if (!id) return;
  await createAdminClient().from("listings").delete().eq("id", id);
  revalidatePath("/admin");
}

export async function setVerified(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const verified = String(formData.get("verified") || "") === "true";
  if (!id) return;
  await createAdminClient().from("profiles").update({ is_verified: verified }).eq("id", id);
  revalidatePath("/admin");
  revalidatePath("/agents");
}
