"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") || ""),
    password: String(formData.get("password") || ""),
  });
  if (error) redirect("/auth?error=" + encodeURIComponent(error.message));
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");
  if (password !== confirm) {
    redirect("/auth?mode=register&error=" + encodeURIComponent("Mật khẩu xác nhận không khớp"));
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: String(formData.get("email") || ""),
    password,
    options: {
      data: {
        full_name: String(formData.get("full_name") || ""),
        role: "user",
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
    },
  });
  if (error) redirect("/auth?mode=register&error=" + encodeURIComponent(error.message));
  revalidatePath("/", "layout");
  redirect("/auth?message=" + encodeURIComponent("Kiểm tra email để xác nhận tài khoản (nếu bật email confirm)."));
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
  });
  if (error) redirect("/auth?error=" + encodeURIComponent(error.message));
  if (data.url) redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
