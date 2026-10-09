"use client";

import { useState } from "react";
import { Phone } from "lucide-react";

// Nút "Xem SĐT" kiểu homigo.life: che số, bấm mới hiện + nút gọi.
export default function PhoneReveal({ phone }: { phone: string }) {
  const [show, setShow] = useState(false);
  const masked = phone.length > 6 ? phone.slice(0, 4) + " *** " + phone.slice(-3) : "*** ***";
  return show ? (
    <a href={`tel:${phone}`} className="btn btn-primary w-full text-center inline-flex items-center justify-center gap-1.5">
      <Phone className="w-4 h-4 shrink-0" />
      <span>{phone} - Gọi ngay</span>
    </a>
  ) : (
    <button className="btn w-full inline-flex items-center justify-center gap-1.5" onClick={() => setShow(true)} type="button">
      <Phone className="w-4 h-4 text-brand shrink-0" />
      <span>{masked} · </span>
      <span className="text-brand font-semibold">Xem SĐT</span>
    </button>
  );
}
