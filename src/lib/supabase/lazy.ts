"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import type { createClient } from "./client";

// 2/11 (audit P1): supabase-js (~67 kB gz) KHÔNG nạp sẵn ở layout gốc nữa. Khách vãng lai/Google không có
// cookie phiên -> không tải chunk này; người đã đăng nhập mới tải (import động) khi cần.

type Client = ReturnType<typeof createClient>;

// Cookie phiên của @supabase/ssr: "sb-<ref>-auth-token", phiên dài bị chia mảnh ".0", ".1"...
// (không tính "sb-<ref>-auth-token-code-verifier" - chỉ là mã tạm của luồng OAuth, chưa phải phiên)
const COOKIE_PHIEN = /(?:^|;\s*)sb-[^=;]+-auth-token(?:\.\d+)?=/;

export function coCookiePhien(): boolean {
  if (typeof document === "undefined") return false;
  try { return COOKIE_PHIEN.test(document.cookie); } catch { return false; }
}

let hua: Promise<Client> | null = null;
// createBrowserClient vốn là singleton trên trình duyệt; giữ thêm promise để chỉ import 1 lần
export function layClient(): Promise<Client> {
  if (!hua) hua = import("./client").then((m) => m.createClient()).catch((e) => { hua = null; throw e; });
  return hua;
}

export type Phien = { xong: boolean; uid: string | null; email: string | null };
const tuPhien = (s: Session | null): Phien => ({ xong: true, uid: s?.user?.id ?? null, email: s?.user?.email ?? null });

// Trạng thái đăng nhập cho UI (nav, menu). Quyền thật do server kiểm.
// Đăng nhập/đăng xuất là server action + redirect (điều hướng mềm, layout không mount lại) ->
// soi lại cookie mỗi lần đổi trang. Có cookie thì nghe onAuthStateChange (tab khác đăng xuất, token làm mới).
export function usePhien(): Phien {
  const path = usePathname();
  const [p, setP] = useState<Phien>({ xong: false, uid: null, email: null });

  useEffect(() => {
    const dat = (moi: Phien) => setP((cu) => (cu.xong === moi.xong && cu.uid === moi.uid && cu.email === moi.email ? cu : moi));
    if (!coCookiePhien()) { dat({ xong: true, uid: null, email: null }); return; }
    let huy = false;
    let bo: (() => void) | undefined;
    layClient().then((sb) => {
      if (huy) return;
      // getSession: đọc cookie tại chỗ, không gọi mạng (1/10)
      sb.auth.getSession().then(({ data }) => { if (!huy) dat(tuPhien(data.session)); });
      const { data: sub } = sb.auth.onAuthStateChange((_e, s) => { if (!huy) dat(tuPhien(s)); });
      bo = () => sub.subscription.unsubscribe();
    }).catch(() => { if (!huy) dat({ xong: true, uid: null, email: null }); });
    return () => { huy = true; bo?.(); };
  }, [path]);

  return p;
}
