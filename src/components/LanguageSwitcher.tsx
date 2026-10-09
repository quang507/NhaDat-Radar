"use client";

import { useEffect, useState } from "react";
import { Globe } from "lucide-react";

export default function LanguageSwitcher() {
  const [currentLang, setCurrentLang] = useState<"vi" | "en">("vi");

  useEffect(() => {
    // Kiểm tra cookie hiện tại của Google Translate
    const match = document.cookie.match(/(?:^|;\s*)googtrans=([^;]*)/);
    if (match && match[1].includes("/en")) {
      setCurrentLang("en");
    } else {
      setCurrentLang("vi");
    }

    // Nạp script Google Translate một lần nếu chưa có
    if (!document.getElementById("google-translate-script")) {
      const script = document.createElement("script");
      script.id = "google-translate-script";
      script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      document.body.appendChild(script);

      (window as unknown as { googleTranslateElementInit: () => void }).googleTranslateElementInit = () => {
        const win = window as unknown as {
          google?: {
            translate?: {
              TranslateElement?: new (
                options: { pageLanguage: string; includedLanguages: string; autoDisplay: boolean },
                elementId: string
              ) => void;
            };
          };
        };
        if (win.google?.translate?.TranslateElement) {
          new win.google.translate.TranslateElement(
            {
              pageLanguage: "vi",
              includedLanguages: "en,vi,ko,zh-CN",
              autoDisplay: false,
            },
            "google_translate_element"
          );
        }
      };
    }
  }, []);

  const changeLanguage = (lang: "vi" | "en") => {
    if (lang === currentLang) return;
    const hostname = window.location.hostname;

    if (lang === "en") {
      document.cookie = "googtrans=/vi/en; path=/";
      document.cookie = `googtrans=/vi/en; path=/; domain=${hostname}`;
      if (hostname.includes(".")) {
        document.cookie = `googtrans=/vi/en; path=/; domain=.${hostname}`;
      }
    } else {
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${hostname}`;
      if (hostname.includes(".")) {
        document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${hostname}`;
      }
    }
    setCurrentLang(lang);
    window.location.reload();
  };

  return (
    <div className="flex items-center text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--surface-2)] p-0.5 shrink-0">
      <div id="google_translate_element" className="hidden" aria-hidden="true" />
      <span className="pl-1.5 pr-0.5 text-[var(--ink-faint)]" aria-hidden>
        <Globe className="w-3.5 h-3.5" />
      </span>
      <button
        type="button"
        onClick={() => changeLanguage("vi")}
        className={`px-1.5 py-0.5 rounded transition-colors ${
          currentLang === "vi"
            ? "bg-[var(--surface)] text-[var(--ink)] shadow-sm font-bold"
            : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
        }`}
        title="Tiếng Việt"
      >
        VI
      </button>
      <button
        type="button"
        onClick={() => changeLanguage("en")}
        className={`px-1.5 py-0.5 rounded transition-colors ${
          currentLang === "en"
            ? "bg-[var(--surface)] text-[var(--ink)] shadow-sm font-bold"
            : "text-[var(--ink-soft)] hover:text-[var(--ink)]"
        }`}
        title="English"
      >
        EN
      </button>
    </div>
  );
}
