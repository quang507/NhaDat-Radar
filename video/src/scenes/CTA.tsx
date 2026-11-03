import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { Entrance, useBreathe } from "../components/Motion";

export const CTA: React.FC<{ ma?: string }> = ({ ma = "e1234567" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logo = spring({ frame: frame - 2, fps, config: theme.spring.bouncy });
  const breathe = useBreathe(20, 0.012);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: theme.fonts.body }}>
      <div style={{ opacity: logo,
        transform: `translateY(${interpolate(logo, [0, 1], [50, 0])}px) scale(${interpolate(logo, [0, 1], [0.8, 1]) * breathe})`,
        fontSize: 120, fontWeight: 800, letterSpacing: "-0.04em", color: theme.colors.text }}>
        nhadat<span style={{ color: theme.colors.primary, textShadow: `0 0 60px ${theme.colors.glow}` }}>radar</span>
      </div>
      <Entrance delay={10}>
        <div style={{ fontSize: 40, color: theme.colors.textDim, marginTop: 24 }}>.com</div>
      </Entrance>
      <Entrance delay={18}>
        <div style={{ marginTop: 90, fontSize: 44, fontWeight: 600, color: theme.colors.text, textAlign: "center" }}>
          Nhắn Zalo kèm mã phòng
        </div>
      </Entrance>
      <Entrance delay={24}>
        <div style={{ marginTop: 28, padding: "18px 34px", borderRadius: theme.radius,
          border: `2px dashed ${theme.colors.line}`, fontSize: 44, fontWeight: 600,
          color: theme.colors.text, fontVariantNumeric: "tabular-nums", letterSpacing: "0.04em" }}>
          Mã: {ma}
        </div>
      </Entrance>
    </AbsoluteFill>
  );
};
