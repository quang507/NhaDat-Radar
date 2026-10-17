import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // ZEN Kaiz Brand & Accent tokens
        brand: { DEFAULT: "#1e7b52", ink: "#165f3f", 2: "#114a31", 50: "#f0fdf4", 100: "#dcfce7", 500: "#1e7b52", 600: "#165f3f" },
        accent: { DEFAULT: "#c2711b", hover: "#a85d14" },
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
      borderRadius: {
        "zen-xs": "4px",
        "zen-sm": "6px",
        "zen-md": "8px",
        "zen-lg": "12px",
        "zen-xl": "16px",
        "zen-2xl": "24px",
      },
      boxShadow: {
        "zen-1": "0 1px 2px 0 rgba(15, 23, 42, 0.04), 0 1px 3px 0 rgba(15, 23, 42, 0.03)",
        "zen-2": "0 2px 4px -1px rgba(15, 23, 42, 0.06), 0 4px 6px -1px rgba(15, 23, 42, 0.05)",
        "zen-3": "0 4px 6px -2px rgba(15, 23, 42, 0.05), 0 10px 15px -3px rgba(15, 23, 42, 0.08)",
        "zen-4": "0 10px 20px -5px rgba(15, 23, 42, 0.08), 0 20px 25px -5px rgba(15, 23, 42, 0.06)",
      },
    },
  },
  plugins: [],
} satisfies Config;
