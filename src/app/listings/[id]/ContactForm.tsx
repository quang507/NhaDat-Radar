"use client";

import { useActionState } from "react";
import { createLead, type LeadState } from "../actions";

const initial: LeadState = { ok: false };

export default function ContactForm({
  listingId,
  listingTitle,
  viaRadar = false, // tin cào: lead vào Radar, KHÔNG tới người đăng -> nói thẳng, không hứa hão
}: {
  listingId: string;
  listingTitle: string;
  viaRadar?: boolean;
}) {
  const [state, formAction, pending] = useActionState(createLead, initial);

  if (state.ok) {
    return (
      <div className="text-emerald-600 text-sm py-3">
        {viaRadar
          ? "✓ Đã nhận. Radar sẽ liên hệ bạn qua SĐT vừa gửi (trong giờ hành chính)."
          : "✓ Đã gửi liên hệ! Người bán sẽ thấy trong mục Liên hệ của họ."}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="listing_id" value={listingId} />
      <label className="block">
        <span className="block text-xs font-semibold text-[var(--ink-soft)] mb-1">Tên của bạn</span>
        <input className="inp" name="name" placeholder="Tên của bạn" required />
      </label>
      <label className="block">
        <span className="block text-xs font-semibold text-[var(--ink-soft)] mb-1">Số điện thoại</span>
        <input className="inp" name="phone" placeholder="SĐT của bạn" required />
      </label>
      <label className="block">
        <span className="block text-xs font-semibold text-[var(--ink-soft)] mb-1">Lời nhắn</span>
        <textarea
          className="inp"
          name="message"
          rows={3}
          defaultValue={viaRadar ? `Tôi muốn được tư vấn các tin tương tự: ${listingTitle.slice(0, 50)}...` : `Tôi quan tâm đến BĐS: ${listingTitle.slice(0, 60)}...`}
        />
      </label>
      {state.error ? <div className="text-red-600 text-sm">{state.error}</div> : null}
      <button className={`btn w-full ${viaRadar ? "" : "btn-primary"}`} type="submit" disabled={pending}>
        {pending ? "Đang gửi..." : viaRadar ? "Nhờ Radar liên hệ lại" : "Gửi tin nhắn cho người bán"}
      </button>
    </form>
  );
}
