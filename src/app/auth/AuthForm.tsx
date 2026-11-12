"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn, signInWithPhone, signUp, resetPassword } from "./actions";
import { dangNhapGoogle } from "@/lib/supabase/lazy";
import Turnstile from "@/components/Turnstile";
import GhiChuDuLieu from "@/components/GhiChuDuLieu";
import { ChevronLeft } from "lucide-react";

type Mode = "login" | "email" | "register" | "forgot";

export default function AuthForm({
  initialMode,
  error,
  message,
  next = "",
}: {
  initialMode: Mode;
  error?: string;
  message?: string;
  next?: string;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [dangGoogle, setDangGoogle] = useState(false);
  const [loiGoogle, setLoiGoogle] = useState<string | null>(null);
  const isLoginTab = mode === "login" || mode === "email";

  async function bamGoogle() {
    if (dangGoogle) return;
    setLoiGoogle(null);
    setDangGoogle(true);
    try {
      const err = await dangNhapGoogle(next);
      if (err) { setLoiGoogle(err); setDangGoogle(false); }
    } catch {
      setLoiGoogle("Chưa mở được Google, vui lòng thử lại.");
      setDangGoogle(false);
    }
  }

  return (
    <div className="card rounded-lg p-5 sm:p-6 shadow-sm">
      <h1 className="prata text-xl sm:text-2xl text-center mb-3.5">Đăng nhập NhaDat Radar</h1>

      {mode !== "forgot" && (
        <div className="flex rounded-lg border border-[var(--line)] overflow-hidden mb-3 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 py-2 min-h-10 cursor-pointer transition ${isLoginTab ? "bg-brand text-white" : "text-[var(--ink-soft)] hover:bg-[var(--surface-2)]"}`}
          >
            Đăng Nhập
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex-1 py-2 min-h-10 cursor-pointer transition ${mode === "register" ? "bg-brand text-white" : "text-[var(--ink-soft)] hover:bg-[var(--surface-2)]"}`}
          >
            Đăng Ký
          </button>
        </div>
      )}

      {isLoginTab && (
        <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[var(--surface-2)] mb-3">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`py-1.5 px-3 rounded-md text-xs font-semibold transition cursor-pointer ${
              mode === "login"
                ? "bg-[var(--surface)] text-[var(--ink)] shadow-2xs"
                : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
            }`}
          >
            Số điện thoại
          </button>
          <button
            type="button"
            onClick={() => setMode("email")}
            className={`py-1.5 px-3 rounded-md text-xs font-semibold transition cursor-pointer ${
              mode === "email"
                ? "bg-[var(--surface)] text-[var(--ink)] shadow-2xs"
                : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
            }`}
          >
            Email &amp; mật khẩu
          </button>
        </div>
      )}

      {error ? <div className="text-sm text-red-600 mb-2.5 text-center">{error}</div> : null}
      {message ? <div className="text-sm text-emerald-600 mb-2.5 text-center">{message}</div> : null}

      {mode === "login" && (
        <form action={signInWithPhone} className="flex flex-col gap-2.5">
          {next && <input type="hidden" name="next" value={next} />}
          <Field label="Số điện thoại" name="phone" type="tel" placeholder="0912 345 678" />
          <Turnstile />
          <button className="btn btn-primary w-full min-h-11 mt-0.5 font-bold" type="submit">
            Đăng nhập
          </button>
        </form>
      )}

      {mode === "email" && (
        <form action={signIn} className="flex flex-col gap-3">
          {next && <input type="hidden" name="next" value={next} />}
          <Field label="Email" name="email" type="email" placeholder="your@email.com" />
          <Field label="Mật Khẩu" name="password" type="password" placeholder="••••••••" />
          <Turnstile />
          <button className="btn btn-primary w-full min-h-11 mt-1" type="submit">Đăng Nhập</button>
          <button type="button" onClick={() => setMode("forgot")} className="text-xs text-brand font-semibold text-center">
            Quên mật khẩu?
          </button>
        </form>
      )}

      {mode === "register" && (
        <form action={signUp} className="flex flex-col gap-3">
          <Field label="Họ và Tên" name="full_name" placeholder="Nguyễn Văn A" />
          <Field label="Email" name="email" type="email" placeholder="your@email.com" />
          <Field label="Mật Khẩu" name="password" type="password" placeholder="••••••••" />
          <Field label="Xác Nhận Mật Khẩu" name="confirm" type="password" placeholder="••••••••" />
          <Turnstile />
          <button className="btn btn-primary w-full min-h-11 mt-1" type="submit">Tạo Tài Khoản</button>
          <p className="text-caption leading-relaxed text-[var(--ink-faint)]">
            Tạo tài khoản là bạn đồng ý với <Link href="/dieu-khoan-su-dung" className="underline hover:text-brand">Điều khoản sử dụng</Link> và{" "}
            <Link href="/chinh-sach-bao-mat" className="underline hover:text-brand">Chính sách bảo mật</Link> của NhaDat Radar.
          </p>
        </form>
      )}

      {mode === "forgot" && (
        <form action={resetPassword} className="flex flex-col gap-3">
          <p className="text-sm text-[var(--ink-soft)] text-center">
            Nhập email đã đăng ký - chúng tôi sẽ gửi link đặt lại mật khẩu.
          </p>
          <Field label="Email" name="email" type="email" placeholder="your@email.com" />
          <Turnstile />
          <button className="btn btn-primary w-full min-h-11" type="submit">Gửi link đặt lại mật khẩu</button>
          <button type="button" onClick={() => setMode("email")} className="text-xs text-[var(--ink-soft)] hover:text-brand font-semibold text-center flex items-center justify-center gap-1 transition">
            <ChevronLeft className="w-4 h-4" />
            <span>Quay lại đăng nhập</span>
          </button>
        </form>
      )}

      {mode !== "forgot" && (
        <>
          <div className="flex items-center gap-3 my-3 text-xs text-[var(--ink-soft)]">
            <span className="h-px flex-1 bg-[var(--line)]" />
            <span>Hoặc</span>
            <span className="h-px flex-1 bg-[var(--line)]" />
          </div>
          <button
            type="button"
            disabled={dangGoogle}
            onClick={bamGoogle}
            className="btn w-full flex items-center justify-center gap-2.5 min-h-11 rounded-lg border border-[var(--line)] hover:bg-[var(--surface-2)] disabled:opacity-60 text-sm font-semibold cursor-pointer"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48" aria-hidden>
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
            </svg>
            <span>{dangGoogle ? "Đang chuyển sang Google..." : "Tiếp tục với Google"}</span>
          </button>
          {loiGoogle ? <div className="text-xs text-red-600 mt-2 text-center">{loiGoogle}</div> : null}
          {mode === "login" && (
            <div className="mt-3 space-y-1 text-center">
              <p className="text-[11px] text-[var(--ink-soft)] leading-relaxed">
                Dùng SĐT từng để lại khi xem tin để vào tài khoản (không cần OTP).
              </p>
              <GhiChuDuLieu mucDich="đăng nhập nhanh bằng SĐT và đồng bộ tin yêu thích của bạn" />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold mb-1">{label}</span>
      <input className="inp" name={name} type={type} placeholder={placeholder} required />
    </label>
  );
}
