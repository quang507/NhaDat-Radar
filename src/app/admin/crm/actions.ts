"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth");
  const { data: p } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (p?.role !== "admin") redirect("/?");
}

// ── BUYERS (Khách Mua) ────────────────────────────────────────────────────────
export async function addBuyer(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;
  const zalo_user_id = String(formData.get("zalo_user_id") || "").trim() || null;
  const district = String(formData.get("district") || "").trim();
  const budget = String(formData.get("budget") || "").trim();
  const property_type = String(formData.get("property_type") || "").trim();
  const notes = String(formData.get("notes") || "").trim() || null;

  const preferences: Record<string, unknown> = {};
  if (district) preferences.district = district;
  if (budget) preferences.budget = budget;
  if (property_type) preferences.property_type = property_type;

  const admin = createAdminClient();
  const { error } = await admin.from("buyers").insert({
    name: name || "Khách mua",
    phone,
    zalo_user_id,
    preferences,
    notes,
    last_contact_at: new Date().toISOString(),
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function updateBuyer(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "").trim();
  if (!id) return;

  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;
  const zalo_user_id = String(formData.get("zalo_user_id") || "").trim() || null;
  const district = String(formData.get("district") || "").trim();
  const budget = String(formData.get("budget") || "").trim();
  const property_type = String(formData.get("property_type") || "").trim();
  const notes = String(formData.get("notes") || "").trim() || null;

  const preferences: Record<string, unknown> = {};
  if (district) preferences.district = district;
  if (budget) preferences.budget = budget;
  if (property_type) preferences.property_type = property_type;

  const admin = createAdminClient();
  const { error } = await admin.from("buyers").update({
    name: name || "Khách mua",
    phone,
    zalo_user_id,
    preferences,
    notes,
    last_contact_at: new Date().toISOString(),
  }).eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function deleteBuyer(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "").trim();
  if (!id) return;
  const admin = createAdminClient();
  await admin.from("buyers").delete().eq("id", id);
  revalidatePath("/admin");
}

// ── SELLERS (Chủ Nhà / Môi Giới) ─────────────────────────────────────────────
export async function addSeller(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;
  const seller_type = String(formData.get("seller_type") || "unknown");
  const zalo_user_id = String(formData.get("zalo_user_id") || "").trim() || null;
  const xung_ho = String(formData.get("xung_ho") || "").trim() || null;

  const admin = createAdminClient();
  const { error } = await admin.from("sellers").insert({
    name: name || "Người bán",
    phone,
    seller_type: ["ccrb", "nmg"].includes(seller_type) ? seller_type : "unknown",
    zalo_user_id,
    xung_ho,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function updateSeller(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "").trim();
  if (!id) return;

  const name = String(formData.get("name") || "").trim();
  const phone = String(formData.get("phone") || "").trim() || null;
  const seller_type = String(formData.get("seller_type") || "unknown");
  const zalo_user_id = String(formData.get("zalo_user_id") || "").trim() || null;
  const xung_ho = String(formData.get("xung_ho") || "").trim() || null;

  const admin = createAdminClient();
  const { error } = await admin.from("sellers").update({
    name: name || "Người bán",
    phone,
    seller_type: ["ccrb", "nmg"].includes(seller_type) ? seller_type : "unknown",
    zalo_user_id,
    xung_ho,
  }).eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function deleteSeller(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "").trim();
  if (!id) return;
  const admin = createAdminClient();
  await admin.from("sellers").delete().eq("id", id);
  revalidatePath("/admin");
}

// ── INTERESTS (Gắn / Gỡ BĐS Quan Tâm) ─────────────────────────────────────────
export async function ganBdsQuanTam(formData: FormData) {
  await requireAdmin();
  const buyer_id = String(formData.get("buyer_id") || "").trim();
  const listing_code_or_id = String(formData.get("listing_code_or_id") || "").trim();
  if (!buyer_id || !listing_code_or_id) return;

  const admin = createAdminClient();

  // Tìm listing theo UUID hoặc theo title / code
  let listingId: string | null = null;
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(listing_code_or_id);

  if (isUuid) {
    listingId = listing_code_or_id;
  } else {
    const { data: found } = await admin
      .from("listings")
      .select("id")
      .or(`id.ilike.${listing_code_or_id}%,title.ilike.%${listing_code_or_id}%`)
      .limit(1)
      .maybeSingle();
    listingId = found?.id ?? null;
  }

  if (!listingId) {
    throw new Error(`Không tìm thấy BĐS với mã hoặc từ khoá "${listing_code_or_id}"`);
  }

  await admin.from("interests").upsert({
    buyer_id,
    listing_id: listingId,
  }, { onConflict: "buyer_id,listing_id" });

  revalidatePath("/admin");
}

export async function xoaBdsQuanTam(formData: FormData) {
  await requireAdmin();
  const buyer_id = String(formData.get("buyer_id") || "").trim();
  const listing_id = String(formData.get("listing_id") || "").trim();
  if (!buyer_id || !listing_id) return;

  const admin = createAdminClient();
  await admin.from("interests").delete().match({ buyer_id, listing_id });
  revalidatePath("/admin");
}

// ── DEALS (Quản lý Phễu Giao Dịch Pipeline) ──────────────────────────────────
export async function createDeal(formData: FormData) {
  await requireAdmin();
  const listing_id = String(formData.get("listing_id") || "").trim();
  const buyer_id = String(formData.get("buyer_id") || "").trim() || null;
  const stage = String(formData.get("stage") || "lead").trim();
  const price_vnd = Number(formData.get("price_vnd") || 0) || null;
  const fee_pct = Number(formData.get("fee_pct") || 1.0) || 1.0;

  if (!listing_id) return;

  const admin = createAdminClient();
  const { error } = await admin.from("deals").insert({
    listing_id,
    buyer_id,
    stage,
    price_vnd,
    fee_pct,
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function updateDealStage(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "").trim();
  const stage = String(formData.get("stage") || "").trim();
  if (!id || !["lead", "viewing", "negotiating", "closing", "won", "lost"].includes(stage)) return;

  const admin = createAdminClient();
  const upd: Record<string, unknown> = { stage };
  if (stage === "won" || stage === "lost") {
    upd.closed_at = new Date().toISOString();
  }

  const { error } = await admin.from("deals").update(upd).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function deleteDeal(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "").trim();
  if (!id) return;
  const admin = createAdminClient();
  await admin.from("deals").delete().eq("id", id);
  revalidatePath("/admin");
}

// ── VIEWINGS (Lịch Hẹn Xem Nhà) ───────────────────────────────────────────────
export async function createViewing(formData: FormData) {
  await requireAdmin();
  const listing_id = String(formData.get("listing_id") || "").trim() || null;
  const buyer_id = String(formData.get("buyer_id") || "").trim() || null;
  const slot = String(formData.get("slot") || "").trim() || null;
  const time_text = String(formData.get("time_text") || "").trim() || null;
  const phone = String(formData.get("phone") || "").trim() || null;
  const note = String(formData.get("note") || "").trim() || null;
  const guide = String(formData.get("guide") || "").trim() || null;

  const admin = createAdminClient();
  const { error } = await admin.from("viewings").insert({
    listing_id,
    buyer_id,
    slot: slot ? new Date(slot).toISOString() : null,
    time_text,
    phone,
    note,
    guide,
    status: "proposed",
    source: "admin_crm",
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function updateViewingStatus(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "").trim();
  const status = String(formData.get("status") || "").trim();
  if (!id || !["proposed", "pending", "done", "cancelled"].includes(status)) return;

  const admin = createAdminClient();
  await admin.from("viewings").update({ status }).eq("id", id);
  revalidatePath("/admin");
}

// ── REMINDERS (Việc Nhắc Nhở) ────────────────────────────────────────────────
export async function createReminder(formData: FormData) {
  await requireAdmin();
  const kind = String(formData.get("kind") || "follow_up").trim();
  const note = String(formData.get("note") || "").trim();
  const due_at = String(formData.get("due_at") || "").trim();
  const buyer_id = String(formData.get("buyer_id") || "").trim() || null;
  const seller_id = String(formData.get("seller_id") || "").trim() || null;
  const listing_id = String(formData.get("listing_id") || "").trim() || null;

  if (!note) return;

  const admin = createAdminClient();
  const { error } = await admin.from("reminders").insert({
    kind,
    note,
    due_at: due_at ? new Date(due_at).toISOString() : new Date().toISOString(),
    buyer_id,
    seller_id,
    listing_id,
    status: "pending",
  });

  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

export async function completeReminder(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "").trim();
  if (!id) return;
  const admin = createAdminClient();
  await admin.from("reminders").update({ status: "done", sent_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/admin");
}

export async function deleteReminder(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "").trim();
  if (!id) return;
  const admin = createAdminClient();
  await admin.from("reminders").delete().eq("id", id);
  revalidatePath("/admin");
}
