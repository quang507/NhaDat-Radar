"use client";

import type { ReactNode } from "react";
import { layClient } from "@/lib/supabase/lazy";

// Đăng xuất chạy ở TRÌNH DUYỆT rồi tải lại trang chủ, không dùng Server Action + điều hướng mềm nữa
// (21/11: khách bấm mà không thấy gì xảy ra, avatar vẫn nằm đó):
//  1) supabase-js xoá cookie phiên ngay tại máy và thu hồi phiên này trên máy chủ Supabase (chỉ phiên này, scope local,
//     không đá văng các máy khác của cùng tài khoản)
//  2) /auth/dang-xuat xoá nốt cookie phía server cho chắc
//  3) tải lại hẳn "/" (không điều hướng mềm) để nav, menu, giỏ yêu thích... đọc lại trạng thái sạch
export default function NutDangXuat({ className, title, children }: { className: string; title?: string; children: ReactNode }) {
  async function xuLy() {
    try { const sb = await layClient(); await sb.auth.signOut({ scope: "local" }); } catch { /* vẫn đi tiếp bước 2-3 */ }
    try { await fetch("/auth/dang-xuat", { method: "POST", credentials: "same-origin" }); } catch { /* bỏ qua */ }
    window.location.assign("/");
  }
  return (
    <button type="button" className={className} title={title} aria-label={title} onClick={xuLy}>
      {children}
    </button>
  );
}
