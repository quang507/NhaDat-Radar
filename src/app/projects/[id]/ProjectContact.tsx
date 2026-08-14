"use client";

import { useActionState, useState } from "react";
import { createLead, type LeadState } from "@/app/listings/actions";

const initial: LeadState = { ok: false };

// Nút "Liên hệ tư vấn" ở trang dự án -> mở form, ghi vào bảng leads.
export default function ProjectContact({ projectName }: { projectName: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(createLead, initial);

  if (state.ok) {
    return <div className="text-emerald-600 text-sm mt-4 text-center">✓ Đã gửi! Chúng tôi sẽ liên hệ tư vấn sớm nhất.</div>;
  }

  if (!open) {
    return (
      <button className="btn btn-primary w-full mt-4" onClick={() => setOpen(true)} type="button">
        📞 Liên hệ tư vấn
      </button>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3 mt-4">
      <input type="hidden" name="listing_id" value="" />
      <input className="inp" name="name" placeholder="Tên của bạn" required />
      <input className="inp" name="phone" placeholder="Số điện thoại" required />
      <textarea className="inp" name="message" rows={2}
        defaultValue={`Tôi quan tâm đến dự án: ${projectName.slice(0, 60)}`} />
      {state.error ? <div className="text-red-600 text-sm">{state.error}</div> : null}
      <div className="flex gap-2">
        <button className="btn btn-primary flex-1" type="submit" disabled={pending}>
          {pending ? "Đang gửi…" : "Gửi yêu cầu tư vấn"}
        </button>
        <button className="btn" type="button" onClick={() => setOpen(false)}>Hủy</button>
      </div>
    </form>
  );
}
