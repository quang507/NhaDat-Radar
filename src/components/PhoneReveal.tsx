"use client";

import { useState } from "react";

// Nút "Xem SĐT" kiểu homigo.life: che số, bấm mới hiện + nút gọi.
export default function PhoneReveal({ phone }: { phone: string }) {
  const [show, setShow] = useState(false);
  const masked = phone.length > 6 ? phone.slice(0, 4) + " *** " + phone.slice(-3) : "*** ***";
  return show ? (
    <a href={`tel:${phone}`} className="btn btn-primary w-full text-center block">
      📞 {phone} - Gọi ngay
    </a>
  ) : (
    <button className="btn w-full" onClick={() => setShow(true)} type="button">
      📞 {masked} · <span className="text-brand">Xem SĐT</span>
    </button>
  );
}
