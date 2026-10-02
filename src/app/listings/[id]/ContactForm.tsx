"use client";

import { useActionState, useEffect } from "react";
import { baoGA } from "@/lib/su-kien-client";
import { createLead, type LeadState } from "../actions";

const initial: LeadState = { ok: false };

export default function ContactForm({
  listingId,
  listingTitle,
  viaRadar = false, // tin cào: lead vào Radar, KHÔNG tới người đăng -> nói thẳng, không hứa hão
  datLich = false,  // rổ hàng Radar: form hẹn xem phòng (ngày + buổi), không cần đăng nhập
}: {
  listingId: string;
  listingTitle: string;
  viaRadar?: boolean;
  datLich?: boolean;
}) {
  const [state, formAction, pending] = useActionState(createLead, initial);
  // chuyển đổi chính của web (2/10): báo GA khi gửi THÀNH CÔNG - đánh dấu "sự kiện chính" trong GA
  useEffect(() => {
    if (state.ok) baoGA(datLich ? "ndr_dat_lich" : "ndr_de_lai_sdt", { listing_id: listingId, kieu: datLich ? "ro_hang" : viaRadar ? "tin_cao" : "tin_tu_dang" });
  }, [state.ok, datLich, viaRadar, listingId]);

  if (state.ok) {
    return (
      <div className="text-emerald-600 text-sm py-3">
        {datLich
          ? "✓ Đã nhận lịch hẹn! Radar gọi lại xác nhận giờ xem phòng trong ít phút (8h-21h)."
          : viaRadar
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
      {datLich && (
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="block text-xs font-semibold text-[var(--ink-soft)] mb-1">Ngày xem</span>
            <input className="inp" type="date" name="hen_ngay" required defaultValue={new Date().toISOString().slice(0, 10)} />
          </label>
          <label className="block">
            <span className="block text-xs font-semibold text-[var(--ink-soft)] mb-1">Buổi</span>
            <select className="inp" name="hen_buoi" defaultValue="Chiều">
              <option>Sáng</option><option>Chiều</option><option>Tối</option>
            </select>
          </label>
        </div>
      )}
      <label className="block">
        <span className="block text-xs font-semibold text-[var(--ink-soft)] mb-1">Lời nhắn</span>
        <textarea
          className="inp"
          name="message"
          rows={3}
          defaultValue={datLich ? `Tôi muốn hẹn xem phòng: ${listingTitle.slice(0, 60)}` : viaRadar ? `Tôi muốn được tư vấn các tin tương tự: ${listingTitle.slice(0, 50)}...` : `Tôi quan tâm đến BĐS: ${listingTitle.slice(0, 60)}...`}
        />
      </label>
      {state.error ? <div className="text-red-600 text-sm">{state.error}</div> : null}
      <button className={`btn w-full ${viaRadar && !datLich ? "" : "btn-primary"}`} type="submit" disabled={pending}>
        {pending ? "Đang gửi..." : datLich ? "📅 Đặt lịch xem phòng" : viaRadar ? "Nhờ Radar liên hệ lại" : "Gửi tin nhắn cho người bán"}
      </button>
    </form>
  );
}
