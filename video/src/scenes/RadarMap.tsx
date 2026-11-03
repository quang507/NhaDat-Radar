import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { Entrance, SceneExit, WordReveal } from "../components/Motion";

const SIZE = 760;
// Vị trí ghim theo góc (độ) và bán kính (0..1)
const pins = [
  { a: 35, r: 0.55, price: "3,2tr" }, { a: 120, r: 0.78, price: "4,5tr" },
  { a: 200, r: 0.42, price: "2,8tr" }, { a: 280, r: 0.7, price: "5tr" },
  { a: 330, r: 0.3, price: "3,9tr" },
];

export const RadarMap: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ringP = spring({ frame: frame - 2, fps, config: theme.spring.smooth });
  const sweep = interpolate(frame, [0, fps * 3], [-90, 270], { easing: theme.ease.inOut });
  const pinsAt = Math.round(fps * 0.6);
  return (
    <SceneExit>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: theme.fonts.body }}>
        <div style={{ width: "100%", padding: "0 96px", marginBottom: 70 }}>
          <WordReveal text="Phòng quanh bạn," delay={2} style={{ fontWeight: 800, fontSize: 96, letterSpacing: "-0.035em", color: theme.colors.text }} />
          <WordReveal text="trên một bản đồ." delay={9} style={{ fontWeight: 800, fontSize: 96, letterSpacing: "-0.035em", color: theme.colors.textDim }} />
        </div>
        <div style={{ position: "relative", width: SIZE, height: SIZE, opacity: ringP,
          transform: `scale(${interpolate(ringP, [0, 1], [0.85, 1])})` }}>
          {[1, 0.66, 0.33].map((s) => (
            <div key={s} style={{ position: "absolute", inset: (SIZE * (1 - s)) / 2, borderRadius: "50%",
              border: `2px solid ${theme.colors.line}` }} />
          ))}
          <div style={{ position: "absolute", inset: 0, borderRadius: "50%",
            // mép sáng đi trước, vệt mờ dần phía sau
            background: `conic-gradient(from ${sweep - 70}deg, transparent, ${theme.colors.primary}88 70deg, transparent 71deg)`,
            maskImage: "radial-gradient(circle, black 69%, transparent 70%)" }} />
          <div style={{ position: "absolute", left: SIZE / 2 - 10, top: SIZE / 2 - 10, width: 20, height: 20,
            borderRadius: "50%", background: theme.colors.text }} />
          {pins.map((p, i) => {
            const pp = spring({ frame: frame - pinsAt - i * 5, fps, config: theme.spring.bouncy });
            const rad = (p.a * Math.PI) / 180;
            const x = SIZE / 2 + Math.cos(rad) * p.r * (SIZE / 2);
            const y = SIZE / 2 + Math.sin(rad) * p.r * (SIZE / 2);
            const float = Math.sin((frame + i * 9) / 18) * 4;
            return (
              <div key={i} style={{ position: "absolute", left: x, top: y + float, opacity: pp,
                transform: `translate(-50%, -100%) scale(${pp})`, transformOrigin: "50% 100%" }}>
                <div style={{ padding: "10px 18px", borderRadius: theme.radius, background: theme.colors.text,
                  color: theme.colors.bg, fontSize: 32, fontWeight: 800, whiteSpace: "nowrap" }}>{p.price}</div>
                <div style={{ width: 0, height: 0, margin: "0 auto", borderLeft: "10px solid transparent",
                  borderRight: "10px solid transparent", borderTop: `12px solid ${theme.colors.text}` }} />
              </div>
            );
          })}
        </div>
        <Entrance delay={pinsAt + 30}>
          <div style={{ marginTop: 60, fontSize: 34, color: theme.colors.textDim }}>Lọc theo quận, giá, diện tích</div>
        </Entrance>
      </AbsoluteFill>
    </SceneExit>
  );
};
