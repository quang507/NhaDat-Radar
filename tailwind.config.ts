import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: "#1E63C7", ink: "#1852A8", 2: "#0EA5A0" },
      },
      fontFamily: {
        serif: ['"Prata"', "Georgia", "serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
