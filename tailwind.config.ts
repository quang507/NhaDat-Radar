import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    // ZEN Kaiz (25/10): KHOÁ CỨNG bo góc 2-4px cho toàn site - đặt ngoài `extend` để ghi đè thang mặc định,
    // nên rounded-lg/xl/2xl/3xl cũ (~330 chỗ) tự về 4px mà không phải sửa từng file. rounded-full giữ cho
    // avatar / chấm trạng thái. Muốn bo khác thì phải sửa ở đây (một chỗ), không viết rounded-[12px].
    borderRadius: {
      none: "0", xs: "2px", sm: "2px", DEFAULT: "4px", md: "4px", lg: "4px", xl: "4px", "2xl": "4px", "3xl": "4px", full: "9999px",
      "zen-xs": "2px", "zen-sm": "4px",
    },
    extend: {
      colors: {
        // ZEN Kaiz Brand & Accent tokens (25/10: Emerald #059669, theo theme qua biến CSS ở globals.css -
        // trước đây gán cứng #1e7b52 nên bg-brand/text-brand KHÔNG đổi theo dark mode)
        brand: {
          DEFAULT: "rgb(var(--brand-rgb) / <alpha-value>)",
          ink: "rgb(var(--brand-ink-rgb) / <alpha-value>)",
          2: "#065f46", 50: "#ecfdf5", 100: "#d1fae5", 500: "#10b981", 600: "#059669", 700: "#047857",
        },
        accent: { DEFAULT: "#c2711b", hover: "#a85d14" },
      },
      textColor: {
        // chữ nhỏ màu brand trên nền trắng: #059669 chỉ 3.8:1 (trượt AA) -> text-brand dùng emerald-700 ở light
        brand: { DEFAULT: "rgb(var(--brand-text-rgb) / <alpha-value>)", ink: "rgb(var(--brand-ink-rgb) / <alpha-value>)" },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        serif: ["var(--font-lora)", "Georgia", "serif"],
      },
      fontSize: {
        // ZEN Kaiz Modular Type Scale (Harmonious hierarchy for Web & Mobile)
        "display-1": ["3.5rem", { lineHeight: "1.15", letterSpacing: "-0.02em", fontWeight: "800" }],     // 56px
        "display-2": ["2.75rem", { lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "800" }],      // 44px
        "display-3": ["2.25rem", { lineHeight: "1.25", letterSpacing: "-0.015em", fontWeight: "800" }],    // 36px
        "h1": ["1.875rem", { lineHeight: "1.3", letterSpacing: "-0.015em", fontWeight: "700" }],           // 30px
        "h2": ["1.5rem", { lineHeight: "1.35", letterSpacing: "-0.01em", fontWeight: "700" }],              // 24px
        "h3": ["1.25rem", { lineHeight: "1.4", letterSpacing: "-0.01em", fontWeight: "600" }],              // 20px
        "h4": ["1.125rem", { lineHeight: "1.45", letterSpacing: "0", fontWeight: "600" }],                 // 18px
        "body-lg": ["1.125rem", { lineHeight: "1.6", letterSpacing: "0", fontWeight: "400" }],             // 18px
        "body": ["1rem", { lineHeight: "1.5", letterSpacing: "-0.005em", fontWeight: "400" }],              // 16px
        "body-sm": ["0.875rem", { lineHeight: "1.45", letterSpacing: "-0.005em", fontWeight: "400" }],      // 14px
        "caption": ["0.75rem", { lineHeight: "1.4", letterSpacing: "0", fontWeight: "500" }],               // 12px
        "overline": ["0.6875rem", { lineHeight: "1.35", letterSpacing: "0.08em", fontWeight: "700" }],     // 11px
      },
      boxShadow: {
        "zen-1": "0 1px 2px 0 rgba(0, 0, 0, 0.03)",
        "zen-2": "0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.03)",
        "zen-3": "0 3px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.03)",
        "zen-4": "0 6px 12px -2px rgba(0, 0, 0, 0.06), 0 3px 6px -3px rgba(0, 0, 0, 0.04)",
      },
    },
  },
  plugins: [],
} satisfies Config;
