"use client";

import { useEffect, useState } from "react";

// THANH TẢI khi chuyển trang (3/11, Clarity: dead click). App Router không có loading.tsx nào -> bấm chip giá / khu vực
// sang /search (render động, TTFB 0.8-1.2 s + ~280 KB RSC trên 4G) thì màn hình đứng im vài giây, khách bấm lại và
// Clarity tính là dead click. Không cần router event: bắt cú bấm link nội bộ ở pha capture (trước khi next/link
// preventDefault), tắt khi Next đổi URL (pushState/replaceState) hoặc Back/Forward.
export default function ThanhTai() {
  const [tai, setTai] = useState(false);

  useEffect(() => {
    let hen: number | undefined, han: number | undefined;
    const tat = () => { clearTimeout(hen); clearTimeout(han); setTai(false); };
    const bat = () => {
      clearTimeout(hen); clearTimeout(han);
      hen = window.setTimeout(() => setTai(true), 150);   // trang có sẵn trong cache (< 150 ms) thì khỏi nháy
      han = window.setTimeout(tat, 15000);                 // lỗi mạng / điều hướng bị huỷ: không treo thanh mãi
    };
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      let u: URL;
      try { u = new URL(a.href, location.href); } catch { return; }
      if (u.origin !== location.origin || (u.pathname === location.pathname && u.search === location.search)) return;
      bat();
    };
    const goc = { push: history.pushState, replace: history.replaceState };
    history.pushState = function (...args: Parameters<History["pushState"]>) { tat(); return goc.push.apply(this, args); };
    history.replaceState = function (...args: Parameters<History["replaceState"]>) {
      // Next gọi replaceState cả khi chỉ lưu vị trí cuộn (URL không đổi) -> chỉ tắt khi URL đổi thật
      const den = args[2] != null ? new URL(String(args[2]), location.href).href : location.href;
      if (den !== location.href) tat();
      return goc.replace.apply(this, args);
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", tat);
    window.addEventListener("pageshow", tat);
    return () => {
      tat();
      history.pushState = goc.push; history.replaceState = goc.replace;
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", tat);
      window.removeEventListener("pageshow", tat);
    };
  }, []);

  if (!tai) return null;
  return (
    <div role="progressbar" aria-label="Đang tải trang" className="fixed top-0 inset-x-0 z-[110] h-0.5 pointer-events-none">
      <div className="h-full bg-brand thanh-tai" />
    </div>
  );
}
