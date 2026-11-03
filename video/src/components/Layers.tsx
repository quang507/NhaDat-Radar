import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { theme } from "../theme";

export const BgMesh: React.FC = () => {
  const frame = useCurrentFrame();
  const d1 = Math.sin(frame / 55) * 50;
  const d2 = Math.cos(frame / 70) * 40;
  return (
    <AbsoluteFill style={{ background: theme.colors.bg }}>
      <div style={{ position: "absolute", width: 1300, height: 1300, borderRadius: "50%",
        top: -520, left: -380 + d1, filter: "blur(60px)",
        background: `radial-gradient(circle, ${theme.colors.primary}26, transparent 62%)` }} />
      <div style={{ position: "absolute", width: 1100, height: 1100, borderRadius: "50%",
        bottom: -420, right: -320 - d2, filter: "blur(70px)",
        background: `radial-gradient(circle, ${theme.colors.accent}88, transparent 65%)` }} />
      {/* lưới mảnh gợi bản đồ */}
      <AbsoluteFill style={{ opacity: 0.35,
        backgroundImage: `linear-gradient(${theme.colors.line} 1px, transparent 1px), linear-gradient(90deg, ${theme.colors.line} 1px, transparent 1px)`,
        backgroundSize: "90px 90px", backgroundPosition: `0px ${frame * 0.4}px`,
        maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)" }} />
    </AbsoluteFill>
  );
};

export const Grade: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    <AbsoluteFill style={{ backgroundColor: theme.colors.primary, mixBlendMode: "soft-light", opacity: 0.12 }} />
    <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.25), transparent 25%, transparent 75%, rgba(0,0,0,0.3))" }} />
  </AbsoluteFill>
);

const NOISE = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")`;

export const Grain: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none", backgroundImage: NOISE, backgroundSize: "220px",
      backgroundPosition: `${(frame * 7) % 220}px ${(frame * 13) % 220}px`,
      opacity: 0.07, mixBlendMode: "overlay" }} />
  );
};

export const Vignette: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: "none",
    background: "radial-gradient(ellipse at center, transparent 52%, rgba(0,0,0,0.45) 100%)" }} />
);
