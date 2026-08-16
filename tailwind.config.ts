import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // xanh lá đậm khớp logo — PHẢI trùng --brand/--brand-ink trong globals.css (2 nơi định nghĩa token)
        brand: { DEFAULT: "#1e7b52", ink: "#165f3f", 2: "#114a31" },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        serif: ["var(--font-lora)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
