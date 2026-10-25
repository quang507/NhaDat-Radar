"use client";

import { useState, useEffect } from "react";
import { Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import DangNhapDeXem from "@/components/DangNhapDeXem";

// Nút "Xem SĐT" kiểu homigo.life: che số, bấm mới hiện + nút gọi.
// Kiểm tra đăng nhập + tải SĐT ở TRÌNH DUYỆT (không ở server) để trang tin giữ cache ISR trên CDN.
// contact_phone: anon không có quyền đọc cột (migration 027) -> chỉ phiên đã đăng nhập mới tải được.
export default function PhoneReveal({
  phoneMasked,
  listingId,
  listingTitle,
}: {
  phoneMasked?: string | null;
  listingId: string;
  listingTitle?: string;
}) {
  // null = đang kiểm tra phiên (chưa vẽ gì, tránh nháy nút "đăng nhập" với người đã đăng nhập)
  const [phien, setPhien] = useState<null | "khach" | { phone: string | null }>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    let huy = false;
    (async () => {
      const sb = createClient();
      // getSession đọc cookie tại chỗ, không gọi mạng; quyền thật do RLS/column grant quyết định
      const { data: { session } } = await sb.auth.getSession();
      if (!session) { if (!huy) setPhien("khach"); return; }
      const { data } = await sb.from("listings").select("contact_phone").eq("id", listingId).maybeSingle();
      if (!huy) setPhien({ phone: data?.contact_phone ?? null });
    })().catch(() => { if (!huy) setPhien("khach"); });
    return () => { huy = true; };
  }, [listingId]);

  if (phien === null) return <div className="h-11" aria-hidden />;
  if (phien === "khach") return <DangNhapDeXem listingId={listingId} listingTitle={listingTitle} />;

  const phone = phien.phone;
  if (!phone) {
    return phoneMasked ? <div className="font-mono text-lg font-bold tracking-wider">{phoneMasked}</div> : null;
  }
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
