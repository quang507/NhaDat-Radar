"use client";

import { useState } from "react";
import { signIn, signUp, signInWithGoogle, resetPassword } from "./actions";
import Turnstile from "@/components/Turnstile";

type Mode = "login" | "register" | "forgot";

export default function AuthForm({
  initialMode,
  error,
  message,
}: {
  initialMode: Mode;
  error?: string;
  message?: string;
}) {
  const [mode, setMode] = useState<Mode>(initialMode);

  return (
    <div className="card rounded-lg p-7 shadow-sm">
      <h1 className="prata text-2xl text-center mb-5">Chào Mừng Đến Với NhaDat Radar</h1>

      {mode !== "forgot" && (
        <div className="flex rounded-xl border border-[var(--line)] overflow-hidden mb-5 text-sm font-semibold">
          <button
            onClick={() => setMode("login")}
            className={`flex-1 py-2 ${mode === "login" ? "bg-brand text-white" : "text-[var(--ink-soft)]"}`}
          >
            Đăng Nhập
          </button>
          <button
            onClick={() => setMode("register")}
            className={`flex-1 py-2 ${mode === "register" ? "bg-brand text-white" : "text-[var(--ink-soft)]"}`}
          >
            Đăng Ký
          </button>
        </div>
      )}

      {mode !== "forgot" && (
        <>
          <form action={signInWithGoogle}>
            <button className="btn w-full flex items-center justify-center gap-2" type="submit">
              <span className="text-[#EA4335] font-bold">G</span> Tiếp Tục Với Google
            </button>
          </form>
          <div className="text-center text-xs text-[var(--ink-soft)] my-4">- HOẶC -</div>
        </>
      )}

      {error ? <div className="text-sm text-red-600 mb-3 text-center">{error}</div> : null}
      {message ? <div className="text-sm text-emerald-600 mb-3 text-center">{message}</div> : null}

      {mode === "login" && (
        <form action={signIn} className="flex flex-col gap-3">
          <Field label="Email" name="email" type="email" placeholder="your@email.com" />
          <Field label="Mật Khẩu" name="password" type="password" placeholder="••••••••" />
          <Turnstile />
          <button className="btn btn-primary w-full mt-1" type="submit">Đăng Nhập</button>
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
          <button className="btn btn-primary w-full mt-1" type="submit">Tạo Tài Khoản</button>
        </form>
      )}
      {mode === "forgot" && (
        <form action={resetPassword} className="flex flex-col gap-3">
          <p className="text-sm text-[var(--ink-soft)] text-center">
            Nhập email đã đăng ký — chúng tôi sẽ gửi link đặt lại mật khẩu.
          </p>
          <Field label="Email" name="email" type="email" placeholder="your@email.com" />
          <Turnstile />
          <button className="btn btn-primary w-full mt-1" type="submit">Gửi Link Đặt Lại</button>
          <button type="button" onClick={() => setMode("login")} className="text-xs text-[var(--ink-soft)] font-semibold text-center">
            ‹ Quay lại đăng nhập
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
