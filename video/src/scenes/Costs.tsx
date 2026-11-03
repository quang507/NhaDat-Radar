import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "../theme";
import { Entrance, SceneExit, WordReveal, useBreathe } from "../components/Motion";

// Số minh hoạ cho video mẫu
const rows = [
  { label: "Tiền phòng", value: 3_500_000, unit: "/tháng" },
  { label: "Điện", value: 3_800, unit: "/kWh" },
  { label: "Nước", value: 100_000, unit: "/người" },
  { label: "Gửi xe", value: 150_000, unit: "/xe" },
  { label: "Dịch vụ", value: 150_000, unit: "/phòng" },
];
const vnd = (n: number) => Math.round(n).toLocaleString("vi-VN") + "đ";

export const Costs: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rowsAt = Math.round(fps * 0.5);
  const totalAt = rowsAt + rows.length * 5 + Math.round(fps * 0.5);
  const totalP = spring({ frame: frame - totalAt, fps, config: { damping: 30, stiffness: 60 } });
  const breathe = useBreathe();
  return (
    <SceneExit>
      <AbsoluteFill style={{ justifyContent: "center", padding: "0 80px", fontFamily: theme.fonts.body }}>
        <WordReveal text="Giá rõ từng khoản." delay={2} style={{ fontWeight: 800, fontSize: 96,
          letterSpacing: "-0.035em", color: theme.colors.text, marginBottom: 18 }} />
        <Entrance delay={8}>
          <div style={{ fontSize: 36, color: theme.colors.textDim, marginBottom: 56 }}>
            Không còn kiểu “giá rẻ” rồi phát sinh.
          </div>
        </Entrance>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {rows.map((r, i) => (
            <Entrance key={r.label} delay={rowsAt + i * 5}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline",
                padding: "30px 36px", background: theme.colors.surface, borderRadius: theme.radius,
                border: `1px solid ${theme.colors.line}` }}>
                <span style={{ fontSize: 40, fontWeight: 600, color: theme.colors.text }}>{r.label}</span>
                <span style={{ fontSize: 40, fontWeight: 600, color: theme.colors.text, fontVariantNumeric: "tabular-nums" }}>
                  {vnd(r.value)}<span style={{ fontSize: 28, color: theme.colors.textDim, fontWeight: 400 }}>{r.unit}</span>
                </span>
              </div>
            </Entrance>
          ))}
        </div>
        <Entrance delay={totalAt}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 34,
            padding: "34px 36px", borderRadius: theme.radius, border: `2px solid ${theme.colors.textDim}`,
            background: theme.colors.surface, transform: `scale(${breathe})` }}>
            <span style={{ fontSize: 40, fontWeight: 600, color: theme.colors.textDim }}>Ước tính / tháng</span>
            <span style={{ fontSize: 64, fontWeight: 800, color: theme.colors.primary, fontVariantNumeric: "tabular-nums",
              letterSpacing: "-0.02em" }}>~{vnd(Math.round(interpolate(totalP, [0, 1], [0, 4_100_000]) / 1000) * 1000)}</span>
          </div>
        </Entrance>
      </AbsoluteFill>
    </SceneExit>
  );
};
