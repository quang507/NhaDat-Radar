import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // terracotta gạch - chủ đạo, bớt "xanh AI"
        brand: { DEFAULT: "#b23a1e", ink: "#90301a", 2: "#1f6f5c" },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        serif: ["var(--font-lora)", "Georgia", "serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
