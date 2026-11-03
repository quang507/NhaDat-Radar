// Nguồn duy nhất cho màu, easing, spring, font. Không inline trong component.
import { Easing } from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "800"],
  subsets: ["latin", "vietnamese"],
});

export const theme = {
  colors: {
    // ZEN Kaiz dark: slate ink + emerald
    bg: "#0B1220",
    bgAlt: "#0F172A",
    surface: "#111C2E",
    line: "rgba(148, 163, 184, 0.18)",
    primary: "#10B981", // hero, tối đa 1 phần tử / khung hình
    accent: "#334155",
    text: "#F8FAFC",
    textDim: "#94A3B8",
    glow: "rgba(16, 185, 129, 0.45)",
  },
  radius: 4,
  fonts: { display: fontFamily, body: fontFamily },
  ease: {
    out: Easing.bezier(0.16, 1, 0.3, 1),
    inOut: Easing.bezier(0.83, 0, 0.17, 1),
    in: Easing.bezier(0.7, 0, 0.84, 0),
  },
  spring: {
    snappy: { damping: 14, stiffness: 160, mass: 0.6 },
    smooth: { damping: 20, stiffness: 90, mass: 1 },
    bouncy: { damping: 11, stiffness: 170, mass: 0.7 },
  },
  // Độ dài cảnh tính bằng giây, nhân fps ở Root
  scenes: { hook: 2.7, costs: 3.8, map: 2.8, cta: 2.4 },
} as const;
