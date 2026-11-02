"use client";

import { useActionState } from "react";
import { Send, CheckCircle2 } from "lucide-react";
import { createLead, type LeadState } from "@/app/listings/actions";
import GhiChuDuLieu from "@/components/GhiChuDuLieu";

// 2/11: form cũ là action="mailto:" và các ô không có name -> trình duyệt không gửi gì, khách tưởng đã gửi
// (kể cả yêu cầu xoá dữ liệu). Giờ ghi vào bảng leads + báo admin như form liên hệ tin đăng.
const initial: LeadState = { ok: false };

export default function FormLienHe() {
  const [state, formAction, pending] = useActionState(createLead, initial);

  if (state.ok) {
    return (
      <div role="status" className="flex items-start gap-2 text-sm text-emerald-700 dark:text-emerald-400 py-3">
        <CheckCircle2 className="w-5 h-5 shrink-0" />
        <span>Đã nhận yêu cầu. Radar sẽ liên hệ lại qua SĐT bạn vừa gửi trong vòng 24 giờ làm việc.</span>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4 text-xs">
      <label className="block">
        <span className="block font-semibold text-[var(--ink)] mb-1">Họ và tên của bạn</span>
        <input className="inp" name="name" autoComplete="name" placeholder="Nguyễn Văn A" maxLength={120} required />
      </label>
      <label className="block">
        <span className="block font-semibold text-[var(--ink)] mb-1">Số điện thoại / Zalo</span>
        <input className="inp" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="0912 345 678" required />
      </label>
      <label className="block">
        <span className="block font-semibold text-[var(--ink)] mb-1">Nội dung yêu cầu</span>
        <textarea
          className="inp resize-none"
          name="message"
          rows={4}
          maxLength={2000}
          placeholder="Nội dung cần hỗ trợ, tư vấn BĐS, yêu cầu về dữ liệu cá nhân hoặc thông tin hợp tác..."
          required
        />
      </label>
      {state.error ? <div role="alert" className="text-sm text-red-600 dark:text-red-400">{state.error}</div> : null}
      <button type="submit" disabled={pending} className="btn btn-primary w-full min-h-11 font-semibold">
        <Send className="w-4 h-4" />
        {pending ? "Đang gửi..." : "Gửi yêu cầu hỗ trợ"}
      </button>
      <GhiChuDuLieu mucDich="liên hệ phản hồi yêu cầu của bạn" />
    </form>
  );
}
