"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Lấy origin thật của request (chạy đúng trên mọi domain Vercel/preview/local),
// fallback NEXT_PUBLIC_SITE_URL - fix lỗi redirect_to=undefined khi env thiếu.
async function siteUrl(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") || h.get("host");
  if (host) return `${h.get("x-forwarded-proto") || "https"}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

// Dịch lỗi Supabase sang tiếng Việt dễ hiểu
function viErr(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "Email hoặc mật khẩu không đúng. Nếu vừa đăng ký, hãy kiểm tra email và bấm link xác nhận trước khi đăng nhập.";
  if (m.includes("email not confirmed")) return "Email chưa được xác nhận - hãy mở hộp thư và bấm link xác nhận trong email từ Supabase.";
  if (m.includes("already registered") || m.includes("already been registered")) return "Email này đã được đăng ký. Hãy chuyển sang tab Đăng Nhập.";
  if (m.includes("at least 6 characters") || m.includes("password should be")) return "Mật khẩu phải có ít nhất 6 ký tự.";
  if (m.includes("provider is not enabled") || m.includes("unsupported provider")) return "Đăng nhập Google chưa được bật trên Supabase. Vui lòng dùng email/mật khẩu, hoặc admin bật Google provider trong Supabase Dashboard.";
  if (m.includes("captcha")) return "Xác minh captcha thất bại - tải lại trang và thử lại.";
  if (m.includes("rate limit") || m.includes("too many")) return "Thao tác quá nhanh, vui lòng thử lại sau ít phút.";
  if (m.includes("invalid email") || m.includes("validate email")) return "Địa chỉ email không hợp lệ.";
  return msg;
}

function captchaOf(formData: FormData): string | undefined {
  const t = String(formData.get("cf-turnstile-response") || "");
  return t || undefined; // chưa bật captcha ở Supabase -> undefined, không ảnh hưởng
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") || "").trim(),
    password: String(formData.get("password") || ""),
    options: { captchaToken: captchaOf(formData) },
  });
  if (error) redirect("/auth?error=" + encodeURIComponent(viErr(error.message)));
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");
  if (password.length < 6) {
    redirect("/auth?mode=register&error=" + encodeURIComponent("Mật khẩu phải có ít nhất 6 ký tự."));
  }
  if (password !== confirm) {
    redirect("/auth?mode=register&error=" + encodeURIComponent("Mật khẩu xác nhận không khớp."));
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: String(formData.get("full_name") || "") },
      emailRedirectTo: `${await siteUrl()}/auth/callback`,
      captchaToken: captchaOf(formData),
    },
  });
  if (error) redirect("/auth?mode=register&error=" + encodeURIComponent(viErr(error.message)));

  // Supabase chống dò email: email đã tồn tại vẫn trả về user "ảo" với identities rỗng
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    redirect("/auth?error=" + encodeURIComponent("Email này đã được đăng ký. Hãy đăng nhập (hoặc dùng Quên mật khẩu)."));
  }

  revalidatePath("/", "layout");
  // Nếu tắt "Confirm email" -> có session ngay, vào thẳng dashboard
  if (data.session) redirect("/dashboard");
  redirect(
    "/auth?message=" +
      encodeURIComponent(`Tài khoản đã tạo! Kiểm tra hộp thư ${email} và bấm link xác nhận, sau đó quay lại đăng nhập.`),
  );
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await siteUrl()}/auth/callback` },
  });
  if (error) redirect("/auth?error=" + encodeURIComponent(viErr(error.message)));
  if (data.url) redirect(data.url);
}

export async function resetPassword(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  if (!email) redirect("/auth?mode=forgot&error=" + encodeURIComponent("Nhập email đã đăng ký."));
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteUrl()}/auth/callback?next=/auth/doi-mat-khau`,
    captchaToken: captchaOf(formData),
  });
  if (error) redirect("/auth?mode=forgot&error=" + encodeURIComponent(viErr(error.message)));
  redirect("/auth?message=" + encodeURIComponent(`Đã gửi link đặt lại mật khẩu tới ${email} - kiểm tra hộp thư (cả mục Spam).`));
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") || "");
  if (password.length < 6) redirect("/auth/doi-mat-khau?error=" + encodeURIComponent("Mật khẩu phải có ít nhất 6 ký tự."));
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/auth/doi-mat-khau?error=" + encodeURIComponent(viErr(error.message)));
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
