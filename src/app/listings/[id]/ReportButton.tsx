"use client";

import { useActionState, useState } from "react";
import { reportListing, type LeadState } from "../actions";
import { REPORT_REASONS } from "@/lib/reports";

const initial: LeadState = { ok: false };

// "Báo tin xấu" (kiểu Báo cáo vi phạm của batdongsan): nút nhỏ -> form gọn -> ghi listing_reports, admin xử lý.
export default function ReportButton({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(reportListing, initial);

  if (state.ok) {
    return <div className="text-xs text-emerald-600 py-2">✓ Đã ghi nhận báo cáo. Cảm ơn bạn - Radar sẽ kiểm tra tin này.</div>;
  }
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-[var(--ink-faint)] hover:text-red-600 underline-offset-2 hover:underline">
        ⚑ Báo tin xấu / sai thông tin
      </button>
    );
  }
  return (
    <form action={formAction} className="mt-2 p-3 rounded-lg border border-[var(--line)] bg-[var(--bg)] flex flex-col gap-2 text-sm">
      <input type="hidden" name="listing_id" value={listingId} />
      <div className="font-semibold text-xs">Tin này có vấn đề gì?</div>
      <select name="reason" className="inp" defaultValue="da_ban" required>
        {Object.entries(REPORT_REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <textarea name="detail" className="inp" rows={2} maxLength={500} placeholder="Chi tiết (tuỳ chọn): bạn biết gì về tin này?" />
      {state.error ? <div className="text-red-600 text-xs">{state.error}</div> : null}
      <div className="flex gap-2">
        <button className="btn !py-1.5 text-xs" type="submit" disabled={pending}>{pending ? "Đang gửi…" : "Gửi báo cáo"}</button>
        <button className="btn !py-1.5 text-xs" type="button" onClick={() => setOpen(false)}>Huỷ</button>
      </div>
      <p className="text-[0.68rem] text-[var(--ink-faint)]">Báo cáo được gửi ẩn danh (nếu chưa đăng nhập). Tin bị báo nhiều sẽ được ưu tiên kiểm tra và ẩn.</p>
    </form>
  );
}
