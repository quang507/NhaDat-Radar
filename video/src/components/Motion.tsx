import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

export const Entrance: React.FC<{ delay?: number; children: React.ReactNode; style?: React.CSSProperties }> =
({ delay = 0, children, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: theme.spring.smooth });
  return (
    <div style={{ ...style, opacity: p,
      transform: `translateY(${interpolate(p, [0, 1], [40, 0])}px) scale(${interpolate(p, [0, 1], [0.94, 1])})` }}>
      {children}
    </div>
  );
};

export const WordReveal: React.FC<{ text: string; delay?: number; per?: number; style?: React.CSSProperties }> =
({ text, delay = 0, per = 3, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: "flex", flexWrap: "wrap", columnGap: 26, ...style }}>
      {text.split(" ").map((word, i) => {
        const p = spring({ frame: frame - delay - i * per, fps, config: theme.spring.snappy });
        return (
          <span key={i} style={{ display: "inline-block", opacity: p,
            transform: `translateY(${interpolate(p, [0, 1], [36, 0])}px)` }}>{word}</span>
        );
      })}
    </div>
  );
};

// Thoát cảnh: 1/3 giây cuối, nhanh hơn lúc vào
export const SceneExit: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const len = Math.round(fps / 3);
  const range = [durationInFrames - len, durationInFrames - 1];
  const y = interpolate(frame, range, [0, -50], { easing: theme.ease.in, ...clamp });
  const o = interpolate(frame, range, [1, 0], { easing: theme.ease.in, ...clamp });
  const blur = interpolate(frame, range, [0, 8], { easing: theme.ease.in, ...clamp });
  return (
    <div style={{ position: "absolute", inset: 0, opacity: o,
      transform: `translateY(${y}px)`, filter: `blur(${blur}px)` }}>{children}</div>
  );
};

export const useBreathe = (speed = 22, amount = 0.015) => {
  const frame = useCurrentFrame();
  return 1 + Math.sin(frame / speed) * amount;
};
