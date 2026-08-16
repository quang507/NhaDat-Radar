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

// Xử lý báo cáo tin xấu: resolved (đã xử lý) / ignored (bỏ qua); kèm tuỳ chọn ẩn tin luôn.
export async function resolveReport(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const status = String(formData.get("status") || "");
  const hideListing = String(formData.get("hide_listing") || "");
  if (!id || !["resolved", "ignored"].includes(status)) return;
  const admin = createAdminClient();
  await admin.from("listing_reports").update({ status }).eq("id", id);
  if (hideListing) {
    await admin.from("listings").update({ status: "hidden" }).eq("id", hideListing);
    // các báo cáo khác của cùng tin coi như đã xử lý
    await admin.from("listing_reports").update({ status: "resolved" }).eq("listing_id", hideListing).eq("status", "new");
  }
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
