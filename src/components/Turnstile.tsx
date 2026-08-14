"use client";

import { useEffect, useRef } from "react";

// Cloudflare Turnstile (captcha vô hình/managed). Site key là CÔNG KHAI — secret
// chỉ nằm trong Supabase Dashboard, không bao giờ ở code.
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "0x4AAAAAAEQClujXbzlwPwmn";
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/api.js?render=explicit";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}

let scriptLoading = false;
function loadScript() {
  if (typeof window === "undefined" || window.turnstile || scriptLoading) return;
  scriptLoading = true;
  const s = document.createElement("script");
  s.src = SCRIPT_SRC;
  s.async = true;
  document.head.appendChild(s);
}

// Render tay (explicit) để widget hoạt động cả khi form mount SAU khi script đã tải
// (đổi tab Đăng nhập/Đăng ký). Token tự chèn vào hidden input cf-turnstile-response
// trong form bao quanh -> server action đọc từ FormData.
export default function Turnstile() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadScript();
    let id: string | null = null;
    let stopped = false;
    const tryRender = () => {
      if (stopped) return;
      if (window.turnstile && ref.current && ref.current.childElementCount === 0) {
        id = window.turnstile.render(ref.current, {
          sitekey: SITE_KEY,
          size: "flexible",
          theme: "auto",
          "response-field-name": "cf-turnstile-response",
        });
      } else if (!window.turnstile) {
        setTimeout(tryRender, 300);
      }
    };
    tryRender();
    return () => {
      stopped = true;
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, []);

  return <div ref={ref} className="min-h-[10px]" />;
}
