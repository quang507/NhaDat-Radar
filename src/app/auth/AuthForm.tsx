"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn, signInWithPhone, signUp, signInWithGoogle, resetPassword } from "./actions";
import Turnstile from "@/components/Turnstile";
import GhiChuDuLieu from "@/components/GhiChuDuLieu";
import { ChevronLeft, Phone } from "lucide-react";

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
  const isLoginTab = mode === "login" || mode === "email";

  return (
    <div className="card rounded-lg p-7 shadow-sm">
      <h1 className="prata text-2xl text-center mb-5">Chào Mừng Đến Với NhaDat Radar</h1>

      {mode !== "forgot" && (
        <div className="flex rounded-xl border border-[var(--line)] overflow-hidden mb-5 text-sm font-semibold">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 py-2.5 min-h-11 ${isLoginTab ? "bg-brand text-white" : "text-[var(--ink-soft)]"}`}
          >
            Đăng Nhập
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex-1 py-2.5 min-h-11 ${mode === "register" ? "bg-brand text-white" : "text-[var(--ink-soft)]"}`}
          >
            Đăng Ký
          </button>
        </div>
      )}

      {mode !== "forgot" && (
        <>
          <form action={signInWithGoogle}>
            {next && <input type="hidden" name="next" value={next} />}
            <button className="btn w-full flex items-center justify-center gap-2.5 min-h-12 border border-[var(--line)] hover:bg-[var(--surface-2)]" type="submit">
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 48 48" aria-hidden>
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
              </svg>
              <span>Tiếp Tục Với Google</span>
            </button>
          </form>
          <div className="text-center text-xs text-[var(--ink-soft)] my-4">- HOẶC -</div>
        </>
      )}

      {isLoginTab && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`py-2 px-3 rounded-lg text-xs font-semibold border transition cursor-pointer ${
              mode === "login"
                ? "border-brand bg-brand/10 text-brand"
                : "border-[var(--line)] text-[var(--ink-soft)] hover:bg-[var(--surface-2)]"
            }`}
          >
            Bằng SĐT (vào luôn)
          </button>
          <button
            type="button"
            onClick={() => setMode("email")}
            className={`py-2 px-3 rounded-lg text-xs font-semibold border transition cursor-pointer ${
              mode === "email"
                ? "border-brand bg-brand/10 text-brand"
                : "border-[var(--line)] text-[var(--ink-soft)] hover:bg-[var(--surface-2)]"
            }`}
          >
            Email &amp; Mật khẩu
          </button>
        </div>
      )}

      {error ? <div className="text-sm text-red-600 mb-3 text-center">{error}</div> : null}
      {message ? <div className="text-sm text-emerald-600 mb-3 text-center">{message}</div> : null}

      {mode === "login" && (
        <form action={signInWithPhone} className="flex flex-col gap-3">
          {next && <input type="hidden" name="next" value={next} />}
          <Field label="Số điện thoại" name="phone" type="tel" placeholder="0912 345 678" />
          <Turnstile />
          <button className="btn btn-primary w-full min-h-12 mt-1 inline-flex items-center justify-center gap-2 font-bold" type="submit">
            <Phone className="w-4 h-4 shrink-0" />
            <span>Vào ngay bằng SĐT</span>
          </button>
          <p className="text-xs text-[var(--ink-soft)] leading-relaxed">
            Không cần mã OTP. Dùng đúng SĐT bạn từng để lại để xem số là vào lại tài khoản khách ngay. Tài khoản Admin/Môi giới/Email vui lòng dùng Google hoặc Email &amp; Mật khẩu.
          </p>
          <GhiChuDuLieu mucDich="đăng nhập nhanh bằng SĐT và đồng bộ tin yêu thích của bạn" />
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
