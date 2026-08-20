"use client";

import { useEffect, useRef } from "react";

// Cloudflare Turnstile (captcha vô hình/managed). Site key là CÔNG KHAI - secret
// chỉ nằm trong Supabase Dashboard, không bao giờ ở code.
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "0x4AAAAAAEQClujXbzlwPwmn";
// LƯU Ý: đường dẫn đúng có "/v0/" - bản cũ thiếu -> 404 -> widget không tải -> không có token
// -> Supabase (đã bật captcha) từ chối MỌI đăng nhập (sự cố 16/8/2026).
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

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
          // Script tải OK nhưng render vẫn fail được (sai site key / sai domain) -> trước đây im lặng:
          // không iframe, token rỗng, người dùng bấm Đăng nhập rồi mới nhận "captcha thất bại" khó hiểu.
          // Sự cố 17/8: mã 110200 trên nha-dat-radar-rkyn.vercel.app vì hostname chưa khai trong widget.
          "error-callback": (code: string) => {
            if (!ref.current) return;
            const fix = code === "110200"
              ? `Tên miền ${typeof window !== "undefined" ? window.location.hostname : ""} chưa được khai báo cho captcha. Quản trị viên cần thêm vào Cloudflare › Turnstile › Hostname Management.`
              : "Tải lại trang; nếu vẫn lỗi, báo quản trị viên kèm mã trên.";
            ref.current.innerHTML =
              `<p class="text-xs text-amber-600">Captcha lỗi (mã ${code}). ${fix}</p>`;
          },
        });
      } else if (!window.turnstile) {
        setTimeout(tryRender, 300);
      }
    };
    // Script bị chặn/lỗi (adblock, mạng) quá 8s -> báo rõ thay vì im lặng để người dùng bấm gửi rồi nhận "captcha thất bại"
    const warn = setTimeout(() => {
      if (!stopped && !window.turnstile && ref.current && ref.current.childElementCount === 0) {
        ref.current.innerHTML = '<p class="text-xs text-amber-600">Không tải được captcha (mạng/adblock chặn challenges.cloudflare.com). Tắt adblock cho trang này rồi tải lại.</p>';
      }
    }, 8000);
    tryRender();
    return () => {
      stopped = true;
      clearTimeout(warn);
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, []);

  return <div ref={ref} className="min-h-[10px]" />;
}
