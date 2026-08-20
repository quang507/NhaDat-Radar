"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseVnd } from "@/lib/vnd";

export type ListingState = { ok: boolean; error?: string };

// Tên tỉnh người dùng gõ tay -> tên chuẩn trong DB (khớp merge.mjs canonProvince), để tin tự đăng lọt vào bộ lọc/trang khu vực.
function canonProvince(p: string): string | null {
  const t = p.toLowerCase().trim();
  if (!t) return null;
  if (/hà nội|ha noi|\bhn\b/.test(t)) return "Hà Nội";
  if (/hồ chí minh|ho chi minh|hcm|sài gòn|sai gon|tphcm|tp\.hcm/.test(t)) return "Hồ Chí Minh";
  if (/đà nẵng|da nang|\bđn\b|\bdn\b/.test(t)) return "Đà Nẵng";
  return p.trim().replace(/^(tp\.?|tỉnh|thành phố)\s+/i, "");
}
function canonDistrict(d: string): string | null {
  const t = d.trim();
  if (!t) return null;
  const m = t.match(/^(q\.?|quận)\s*(\d{1,2})$/i); if (m) return `Quận ${m[2]}`;
  return t.replace(/^q\.\s*/i, "Quận ").replace(/^h\.\s*/i, "Huyện ").replace(/^p\.\s*/i, "Phường ");
}

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
  const price = parseVnd(String(formData.get("price") || ""));
  if (!title) return { ok: false, error: "Nhập tiêu đề tin." };
  if (!price) return { ok: false, error: "Giá chưa đọc được - nhập kiểu \"8,5 tỷ\" hoặc \"12 triệu\"." };
  if (price < 1e5) return { ok: false, error: "Giá quá nhỏ - bạn có quên đơn vị (tỷ/triệu) không?" };
  const contactPhone = String(formData.get("contact_phone") || "").replace(/[^\d+]/g, "");
  if (contactPhone && !/^(\+?84|0)\d{9,10}$/.test(contactPhone)) return { ok: false, error: "SĐT không hợp lệ (10 số, bắt đầu bằng 0)." };
  // NĐ13: SĐT chỉ hiển thị công khai khi người đăng đồng ý rõ ràng
  if (contactPhone && formData.get("phone_consent") !== "on") return { ok: false, error: "Tích ô đồng ý hiển thị SĐT (hoặc bỏ trống SĐT để chỉ nhận liên hệ qua form)." };

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
    province: canonProvince(String(formData.get("province") || "")),
    district: canonDistrict(String(formData.get("district") || "")),
    address: String(formData.get("address") || "") || null,
    contact_name: String(formData.get("contact_name") || "") || null,
    contact_phone: contactPhone || null,
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

  if (error) {
    console.error("createListing:", error.message); // không lộ lỗi Postgres ra người dùng
    return { ok: false, error: "Chưa đăng được tin, vui lòng thử lại. Nếu lặp lại, báo cho Radar kèm giờ gặp lỗi." };
  }
  revalidatePath("/dashboard");
  revalidatePath("/");
  redirect("/dashboard");
}

// Người bán xác nhận/từ chối, hoặc bên nào cũng hủy được lịch hẹn.
// RLS (appt_participants) chỉ cho buyer/agent của lịch đó update - an toàn.
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
