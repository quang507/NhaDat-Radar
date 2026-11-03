import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { clamp, Entrance, SceneExit, WordReveal } from "../components/Motion";

const headline: React.CSSProperties = {
  fontFamily: theme.fonts.display, fontWeight: 800, fontSize: 124,
  letterSpacing: "-0.035em", lineHeight: 1.05, color: theme.colors.text,
};

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const strikeAt = Math.round(fps * 1.25);
  const strike = interpolate(frame, [strikeAt, strikeAt + Math.round(fps * 0.4)], [0, 1], { easing: theme.ease.out, ...clamp });
  const dim = interpolate(strike, [0, 1], [1, 0.45]);
  return (
    <SceneExit>
      <AbsoluteFill style={{ justifyContent: "center", padding: "0 96px" }}>
        <Entrance delay={2}>
          <div style={{ fontFamily: theme.fonts.body, fontWeight: 600, fontSize: 34, letterSpacing: "0.22em",
            color: theme.colors.textDim, marginBottom: 40 }}>THUÊ PHÒNG TP.HCM</div>
        </Entrance>
        <WordReveal text="Tìm phòng" delay={4} style={headline} />
        <WordReveal text="không cần lướt" delay={10} style={headline} />
        <div style={{ position: "relative", alignSelf: "flex-start", marginTop: 8 }}>
          <WordReveal text="50 nhóm Zalo." delay={18} style={{ ...headline, opacity: dim }} />
          <div style={{ position: "absolute", left: -8, top: "54%", height: 14, borderRadius: theme.radius,
            width: `calc(${strike * 100}% + 16px)`, background: theme.colors.primary,
            boxShadow: `0 0 40px ${theme.colors.glow}` }} />
        </div>
      </AbsoluteFill>
    </SceneExit>
  );
};
