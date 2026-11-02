"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// 2/11 (audit 🔴4): xoá tài khoản trong app (Google Play User Data policy, Apple 5.1.1(v)).
// Đã soát schema (schema.sql, 025, 037): profiles cascade từ auth.users -> favorites, conversations(+messages),
// appointments, saved_searches(user_id), xem_sdt; buyers/sellers.auth_user_id và listings.agent_id là SET NULL
// -> phải gỡ tay; buyers/sellers name/phone đều cho phép null.

export type KetQuaXoa = { loi?: string };
const CAU_XAC_NHAN = "XOA TAI KHOAN";
type Admin = ReturnType<typeof createAdminClient>;

// list() chỉ trả 1 cấp; mục có id === null là thư mục con -> đệ quy (ImageUpload lưu uploads/<uid>/<tệp>)
async function lietKeFile(admin: Admin, thuMuc: string): Promise<string[]> {
  const ra: string[] = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.storage.from("uploads").list(thuMuc, { limit: 1000, offset });
    if (error || !data?.length) break;
    for (const o of data) {
      const p = `${thuMuc}/${o.name}`;
      if (o.id === null) ra.push(...(await lietKeFile(admin, p)));
      else ra.push(p);
    }
    if (data.length < 1000) break;
  }
  return ra;
}

export async function xoaTaiKhoan(_truoc: KetQuaXoa, formData: FormData): Promise<KetQuaXoa> {
  if (String(formData.get("xac_nhan") || "").trim().toUpperCase() !== CAU_XAC_NHAN)
    return { loi: `Gõ đúng "${CAU_XAC_NHAN}" để xác nhận.` };

  // getUser() hỏi Auth server - không tin getSession() đọc từ cookie
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth?message=" + encodeURIComponent("Phiên đã hết, đăng nhập lại để xoá tài khoản."));
  const uid = user.id;
  const admin = createAdminClient();

  const { data: hs } = await admin.from("profiles").select("role").eq("id", uid).maybeSingle();
  if (hs?.role === "admin") return { loi: "Tài khoản quản trị không tự xoá ở đây." };

  // Lấy id tin TRƯỚC khi xoá user (agent_id là SET NULL -> xoá user xong sẽ không tìm lại được)
  const { data: tin } = await admin.from("listings").select("id").eq("agent_id", uid);
  const idTin = (tin ?? []).map((t) => t.id as string);

  // Ảnh đã tải lên (tin đăng + avatar)
  const files = await lietKeFile(admin, uid);
  for (let i = 0; i < files.length; i += 100) await admin.storage.from("uploads").remove(files.slice(i, i + 100));

  // CRM không có cascade: gỡ dữ liệu định danh, giữ deal/lịch sử ẩn danh
  await admin.from("buyers").update({ name: null, phone: null, zalo_user_id: null, notes: null }).eq("auth_user_id", uid);
  await admin.from("sellers").update({ name: null, phone: null, phone_proxy: null, zalo_user_id: null }).eq("auth_user_id", uid);
  // đăng ký nhận tin bằng email khi chưa gắn tài khoản (user_id null) - có user_id thì cascade
  if (user.email) await admin.from("saved_searches").delete().is("user_id", null).eq("email", user.email);

  // Cascade: profiles -> favorites, conversations(+messages), appointments, saved_searches, xem_sdt
  const { error } = await admin.auth.admin.deleteUser(uid);
  if (error) {
    console.error("xoaTaiKhoan deleteUser:", error.message);
    return { loi: "Chưa xoá được tài khoản. Thử lại sau ít phút hoặc gửi yêu cầu ở trang /xoa-tai-khoan." };
  }
  // Xoá hẳn tin -> trigger trg_bia_mo_tin ghi bia mộ, URL cũ 301 về trang khu vực (giữ SEO)
  for (let i = 0; i < idTin.length; i += 200) await admin.from("listings").delete().in("id", idTin.slice(i, i + 200));

  await supabase.auth.signOut({ scope: "local" }).catch(() => {});
  revalidatePath("/agents");
  redirect("/auth?message=" + encodeURIComponent("Đã xoá tài khoản và dữ liệu cá nhân của bạn."));
}
