"use server";

import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimitChung } from "@/lib/supabase/anon";
import { chuanHoaSdt, emailTuSdt, PHONE_QUICK_DOMAIN, SDT_RE } from "@/lib/hotline";

// Lấy origin thật của request (chạy đúng trên mọi domain Vercel/preview/local),
// fallback NEXT_PUBLIC_SITE_URL - fix lỗi redirect_to=undefined khi env thiếu.
async function siteUrl(): Promise<string> {
  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;
  const host = h.get("x-forwarded-host") || h.get("host");
  if (host) return `${h.get("x-forwarded-proto") || "https"}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL || "https://www.nhadatradar.com";
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
  if (m.includes("flow state") || m.includes("code verifier")) return "Phiên đăng nhập Google đã hết hạn hoặc bị gián đoạn, vui lòng bấm Đăng nhập bằng Google lại.";
  return msg;
}

function captchaOf(formData: FormData): string | undefined {
  const t = String(formData.get("cf-turnstile-response") || "");
  return t || undefined; // chưa bật captcha ở Supabase -> undefined, không ảnh hưởng
}

function hmacMatKhauSdt(sdt: string): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.REVALIDATE_SECRET;
  if (!secret) throw new Error("Thiếu khoá máy chủ cho đăng nhập SĐT");
  return createHmac("sha256", secret).update(`ndr-sdt-v1:${sdt}`).digest("base64url");
}

function safeNextPath(raw: unknown): string {
  const s = String(raw || "");
  return s.startsWith("/") && !s.startsWith("//") ? s : "";
}

export type SdtSessionResult =
  | { ok: true; userId: string; accessToken: string; sdt: string }
  | { ok: false; error: string };

/**
 * Tạo hoặc mở phiên tài khoản khách bằng SĐT (không cần OTP).
 * Khoá chặt an toàn: chỉ dùng email nội bộ `@sdt.nhadatradar.local` với `role = 'user'`;
 * từ chối nếu SĐT thuộc tài khoản `admin`/`agent` hoặc tài khoản Email/Google thật.
 */
export async function xuLyPhienSdt(rawSdt: string, captchaToken?: string): Promise<SdtSessionResult> {
  const sdt = chuanHoaSdt(rawSdt);
  if (!SDT_RE.test(sdt)) {
    return { ok: false, error: "Số điện thoại chưa đúng (VD: 0912 345 678)." };
  }
  const h = await headers();
  const ip = (h.get("x-forwarded-for") || h.get("x-real-ip") || "?").split(",")[0].trim();
  if (!(await rateLimitChung(`sdt-auth:${ip}`, 20, 24 * 60 * 60 * 1000))) {
    return { ok: false, error: "Bạn thao tác quá nhiều lần hôm nay - thử lại sau nhé." };
  }

  const admin = createAdminClient();
  const { data: matched } = await admin.from("profiles").select("id, role").eq("phone", sdt).limit(10);
  let existingSdtGuestId: string | null = null;
  for (const p of matched ?? []) {
    if (p.role === "admin" || p.role === "agent") {
      return { ok: false, error: "Số điện thoại này thuộc tài khoản quản trị hoặc môi giới. Vui lòng đăng nhập bằng Google hoặc Email." };
    }
    const { data: uData } = await admin.auth.admin.getUserById(p.id);
    const em = uData?.user?.email?.toLowerCase() || "";
    if (em && !em.endsWith(`@${PHONE_QUICK_DOMAIN}`)) {
      return { ok: false, error: "Số điện thoại này đã liên kết tài khoản Google hoặc Email. Hãy đăng nhập bằng Google/Email." };
    }
    if (em === emailTuSdt(sdt)) existingSdtGuestId = p.id;
  }

  const email = emailTuSdt(sdt);
  const password = hmacMatKhauSdt(sdt);
  const supabase = await createClient();
  const opts = captchaToken ? { captchaToken } : undefined;

  let sign = await supabase.auth.signInWithPassword({ email, password, options: opts });
  if (sign.error) {
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: `Khách ${sdt.slice(-4)}` },
    });
    if (!created.error && created.data.user) {
      await admin.from("profiles").update({ phone: sdt }).eq("id", created.data.user.id);
      sign = await supabase.auth.signInWithPassword({ email, password, options: opts });
    } else if (existingSdtGuestId) {
      await admin.auth.admin.updateUserById(existingSdtGuestId, { password });
      sign = await supabase.auth.signInWithPassword({ email, password, options: opts });
    } else {
      await new Promise((r) => setTimeout(r, 120));
      sign = await supabase.auth.signInWithPassword({ email, password, options: opts });
    }
  }

  if (sign.error || !sign.data.session || !sign.data.user) {
    console.error("xuLyPhienSdt failed:", sign.error?.message);
    return { ok: false, error: "Chưa đăng nhập được bằng SĐT, bạn thử lại nhé." };
  }

  const { data: prof } = await admin.from("profiles").select("role, phone").eq("id", sign.data.user.id).maybeSingle();
  if (prof && prof.role !== "user") {
    await supabase.auth.signOut();
    return { ok: false, error: "Tài khoản này cần xác thực Google hoặc Email." };
  }
  if (!prof?.phone) {
    await admin.from("profiles").update({ phone: sdt }).eq("id", sign.data.user.id);
  }

  return {
    ok: true,
    userId: sign.data.user.id,
    accessToken: sign.data.session.access_token,
    sdt,
  };
}

export async function signInWithPhone(formData: FormData) {
  const sdt = String(formData.get("phone") || "").trim();
  const next = safeNextPath(formData.get("next"));
  const kq = await xuLyPhienSdt(sdt, captchaOf(formData));
  if (!kq.ok) {
    redirect(`/auth?mode=phone&error=${encodeURIComponent(kq.error)}${next ? `&next=${encodeURIComponent(next)}` : ""}`);
  }
  redirect(next || "/dashboard");
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const next = safeNextPath(formData.get("next"));
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") || "").trim(),
    password: String(formData.get("password") || ""),
    options: { captchaToken: captchaOf(formData) },
  });
  if (error) redirect(`/auth?error=${encodeURIComponent(viErr(error.message))}${next ? `&next=${encodeURIComponent(next)}` : ""}`);
  redirect(next || "/dashboard");
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

  // Nếu tắt "Confirm email" -> có session ngay, vào thẳng dashboard
  if (data.session) redirect("/dashboard");
  redirect(
    "/auth?message=" +
      encodeURIComponent(`Tài khoản đã tạo! Kiểm tra hộp thư ${email} và bấm link xác nhận, sau đó quay lại đăng nhập.`),
  );
}

export async function signInWithGoogle(formData?: FormData) {
  const supabase = await createClient();
  // 2/10: nút "Bấm để hiện số" ở trang tin gửi kèm next=<trang đang xem> -> đăng nhập xong quay về đúng tin
  const nextRaw = String(formData?.get?.("next") || "");
  const next = nextRaw.startsWith("/") && !nextRaw.startsWith("//") ? nextRaw : "";
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await siteUrl()}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ""}` },
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
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
