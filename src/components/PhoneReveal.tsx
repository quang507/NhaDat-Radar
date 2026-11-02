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
  const [phien, setPhien] = useState<null | "khach" | "dang_nhap" | "qua_gioi_han" | { phone: string | null }>(null);
  const [dangTai, setDangTai] = useState(false);

  // Lúc mở trang CHỈ kiểm tra phiên. getSession đọc cookie tại chỗ, không gọi mạng.
  // 2/11: trước đây tải SĐT ngay khi mở trang -> sau migration 037 mỗi lượt xem trang trừ 1/30 hạn mức xem SĐT
  // và ghi nhật ký xem_sdt sai (khách chưa hề bấm). Giờ chỉ gọi RPC khi bấm "Xem SĐT".
  useEffect(() => {
    let huy = false;
    createClient().auth.getSession()
      .then(({ data }) => { if (!huy) setPhien(data.session ? "dang_nhap" : "khach"); })
      .catch(() => { if (!huy) setPhien("khach"); });
    return () => { huy = true; };
  }, [listingId]);

  async function xemSo() {
    if (dangTai) return;
    setDangTai(true);
    try {
      const sb = createClient();
      // SĐT qua RPC có giới hạn 30 tin/ngày/tài khoản (migration 037). RPC chưa có (PGRST202 - chưa chạy
      // migration) thì đọc cột như cũ; sau 037 authenticated không còn quyền đọc cột này.
      const rpc = await sb.rpc("lay_sdt_tin", { p_listing: listingId });
      if (rpc.error?.message?.includes("qua_gioi_han_xem_sdt")) { setPhien("qua_gioi_han"); return; }
      if (!rpc.error) { setPhien({ phone: (rpc.data as string | null) ?? null }); return; }
      const { data } = await sb.from("listings").select("contact_phone").eq("id", listingId).maybeSingle();
      setPhien({ phone: data?.contact_phone ?? null });
    } catch {
      setPhien({ phone: null });
    } finally {
      setDangTai(false);
    }
  }

  if (phien === null) return <div className="h-11" aria-hidden />;
  if (phien === "khach") return <DangNhapDeXem listingId={listingId} listingTitle={listingTitle} />;
  if (phien === "qua_gioi_han") {
    return (
      <p className="text-sm text-[var(--ink-soft)]">
        Bạn đã xem SĐT của 30 tin hôm nay (giới hạn để bảo vệ dữ liệu người đăng). Bạn vẫn để lại liên hệ qua form trên trang được, hoặc quay lại vào ngày mai.
      </p>
    );
  }
  if (phien === "dang_nhap") {
    return (
      <button className="btn w-full inline-flex items-center justify-center gap-1.5" onClick={xemSo} disabled={dangTai} type="button">
        <Phone className="w-4 h-4 text-brand shrink-0" />
        <span>{phoneMasked || "*** ***"} · </span>
        <span className="text-brand font-semibold">{dangTai ? "Đang tải…" : "Xem SĐT"}</span>
      </button>
    );
  }

  const phone = phien.phone;
  if (!phone) {
    return phoneMasked ? <div className="font-mono text-lg font-bold tracking-wider">{phoneMasked}</div> : null;
  }
  return (
    <a href={`tel:${phone}`} className="btn btn-primary w-full text-center inline-flex items-center justify-center gap-1.5">
      <Phone className="w-4 h-4 shrink-0" />
      <span>{phone} - Gọi ngay</span>
    </a>
  );
}
