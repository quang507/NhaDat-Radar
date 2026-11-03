// Video "3 bước thuê phòng qua Radar": tìm trên bản đồ -> bấm Zalo (mã tự chép) -> dán gửi, Radar hẹn xem.
import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { theme } from "./theme";
import { BgMesh, Grade, Grain, Vignette } from "./components/Layers";
import { clamp, Entrance, SceneExit, WordReveal, useBreathe } from "./components/Motion";
import { giayCanh, Loi, nhacNen, VoMap } from "./components/Vo";
import { CTA } from "./scenes/CTA";

const CANH = ["mo", "b1", "b2", "b3", "cta"] as const;
const NHIP = { mo: 2.4, b1: 3.6, b2: 3.6, b3: 3.8, cta: 2.6 };
const MA = "RH682A26";
const font = theme.fonts.body;

export const khungBaBuoc = (fps: number, vo: VoMap = {}) => {
  const len = CANH.map((c) => Math.round(giayCanh(NHIP[c], vo[c]) * fps));
  const from = len.map((_, i) => len.slice(0, i).reduce((a, b) => a + b, 0));
  return { len, from, total: len.reduce((a, b) => a + b, 0) };
};

const The: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ background: theme.colors.surface, border: `1px solid ${theme.colors.line}`, borderRadius: theme.radius,
    padding: "30px 36px", ...style }}>{children}</div>
);

const Mo: React.FC = () => (
  <SceneExit>
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 96px", fontFamily: font }}>
      <Entrance delay={2}>
        <div style={{ fontWeight: 600, fontSize: 34, letterSpacing: "0.22em", color: theme.colors.textDim, marginBottom: 40 }}>THUÊ PHÒNG QUA RADAR</div>
      </Entrance>
      <WordReveal text="Chỉ cần" delay={4} style={{ fontWeight: 800, fontSize: 124, letterSpacing: "-0.035em", lineHeight: 1.05, color: theme.colors.text }} />
      <WordReveal text="3 bước." delay={9} style={{ fontWeight: 800, fontSize: 210, letterSpacing: "-0.05em", lineHeight: 1, color: theme.colors.primary,
        textShadow: `0 0 70px ${theme.colors.glow}` }} />
    </AbsoluteFill>
  </SceneExit>
);

// Khung chung cho mỗi bước: số lớn + tiêu đề trên, hình minh hoạ dưới
const Buoc: React.FC<{ so: string; tieuDe: string; phu: string; children: React.ReactNode }> = ({ so, tieuDe, phu, children }) => (
  <SceneExit>
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 80px 120px", fontFamily: font }}>
      <Entrance delay={0}>
        <div style={{ fontSize: 160, fontWeight: 800, letterSpacing: "-0.05em", lineHeight: 1, color: theme.colors.textDim,
          fontVariantNumeric: "tabular-nums", opacity: 0.5 }}>{so}</div>
      </Entrance>
      <WordReveal text={tieuDe} delay={4} style={{ fontWeight: 800, fontSize: 92, letterSpacing: "-0.035em", lineHeight: 1.05,
        color: theme.colors.text, marginTop: 10 }} />
      <Entrance delay={10}>
        <div style={{ fontSize: 38, color: theme.colors.textDim, marginTop: 20, marginBottom: 70 }}>{phu}</div>
      </Entrance>
      {children}
    </AbsoluteFill>
  </SceneExit>
);

const B1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ghim = [{ x: 22, y: 30, g: "3,2tr" }, { x: 62, y: 18, g: "4,2tr" }, { x: 46, y: 46, g: "2,8tr" }, { x: 82, y: 38, g: "5tr" }];
  const chon = 1;
  const moThe = spring({ frame: frame - Math.round(fps * 1.4), fps, config: theme.spring.smooth });
  return (
    <Buoc so="01" tieuDe="Tìm trên bản đồ" phu="Giá ghi rõ từng khoản, không phí ẩn">
      <The style={{ position: "relative", height: 560, padding: 0, overflow: "hidden" }}>
        {/* lưới đường phố giản lược */}
        {[18, 40, 66, 86].map((y) => <div key={`h${y}`} style={{ position: "absolute", left: 0, right: 0, top: `${y}%`, height: 2, background: theme.colors.line }} />)}
        {[14, 38, 70].map((x) => <div key={`v${x}`} style={{ position: "absolute", top: 0, bottom: 0, left: `${x}%`, width: 2, background: theme.colors.line }} />)}
        {ghim.map((p, i) => {
          const pp = spring({ frame: frame - 14 - i * 5, fps, config: theme.spring.bouncy });
          const laChon = i === chon;
          return (
            <div key={i} style={{ position: "absolute", left: `${p.x}%`, top: `${p.y}%`, opacity: pp,
              transform: `translate(-50%, -100%) scale(${pp * (laChon ? interpolate(moThe, [0, 1], [1, 1.15]) : 1)})`, transformOrigin: "50% 100%" }}>
              <div style={{ padding: "10px 18px", borderRadius: theme.radius, fontSize: 32, fontWeight: 800, whiteSpace: "nowrap",
                background: laChon ? theme.colors.primary : theme.colors.text, color: theme.colors.bg }}>{p.g}</div>
            </div>
          );
        })}
        <div style={{ position: "absolute", left: 30, right: 30, bottom: 30, opacity: moThe,
          transform: `translateY(${interpolate(moThe, [0, 1], [60, 0])}px)` }}>
          <The style={{ background: theme.colors.bgAlt, display: "flex", flexDirection: "column", gap: 10 }}>
            {[["Tiền phòng", "4,2 triệu"], ["Điện", "3.500 đ/kWh"], ["Nước", "100.000 đ/người"]].map(([a, b]) => (
              <div key={a} style={{ display: "flex", justifyContent: "space-between", fontSize: 34, fontWeight: 600, color: theme.colors.text }}>
                <span style={{ color: theme.colors.textDim }}>{a}</span><span style={{ fontVariantNumeric: "tabular-nums" }}>{b}</span>
              </div>
            ))}
          </The>
        </div>
      </The>
    </Buoc>
  );
};

const B2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bamAt = Math.round(fps * 1.2);
  const nhan = interpolate(frame, [bamAt, bamAt + 4, bamAt + 10], [1, 0.94, 1], clamp);
  const toast = spring({ frame: frame - bamAt - 6, fps, config: theme.spring.snappy });
  const breathe = useBreathe(18, 0.012);
  return (
    <Buoc so="02" tieuDe="Bấm nút Zalo" phu="Mã phòng được chép sẵn cho bạn">
      <The style={{ display: "flex", flexDirection: "column", gap: 34, alignItems: "stretch" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 36, color: theme.colors.textDim }}>Mã phòng</span>
          <span style={{ fontSize: 56, fontWeight: 800, letterSpacing: "0.06em", color: theme.colors.text, fontVariantNumeric: "tabular-nums" }}>{MA}</span>
        </div>
        <div style={{ height: 120, borderRadius: theme.radius, background: theme.colors.primary, color: theme.colors.bg,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 48, fontWeight: 800,
          transform: `scale(${nhan * (frame < bamAt ? breathe : 1)})`, boxShadow: `0 0 60px ${theme.colors.glow}` }}>Nhắn Zalo</div>
      </The>
      <div style={{ marginTop: 40, alignSelf: "center", opacity: toast, transform: `translateY(${interpolate(toast, [0, 1], [30, 0])}px)` }}>
        <The style={{ display: "flex", alignItems: "center", gap: 20, padding: "24px 34px", border: `2px solid ${theme.colors.textDim}` }}>
          <span style={{ fontSize: 40, fontWeight: 800, color: theme.colors.text }}>✓</span>
          <span style={{ fontSize: 38, fontWeight: 600, color: theme.colors.text }}>Đã chép mã {MA}</span>
        </The>
      </div>
    </Buoc>
  );
};

const BongChat: React.FC<{ tu: "khach" | "radar"; delay: number; children: React.ReactNode }> = ({ tu, delay, children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: theme.spring.snappy });
  const khach = tu === "khach";
  return (
    <div style={{ alignSelf: khach ? "flex-end" : "flex-start", maxWidth: "82%", opacity: p,
      transform: `translateY(${interpolate(p, [0, 1], [30, 0])}px) scale(${interpolate(p, [0, 1], [0.92, 1])})`,
      transformOrigin: khach ? "100% 100%" : "0% 100%" }}>
      {!khach && <div style={{ fontSize: 28, fontWeight: 600, color: theme.colors.textDim, marginBottom: 8 }}>Radar</div>}
      <div style={{ padding: "26px 32px", borderRadius: theme.radius, fontSize: 38, lineHeight: 1.3,
        background: khach ? theme.colors.text : theme.colors.surface, color: khach ? theme.colors.bg : theme.colors.text,
        border: khach ? "none" : `1px solid ${theme.colors.line}` }}>{children}</div>
    </div>
  );
};

const B3: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
    <Buoc so="03" tieuDe="Dán vào Zalo, gửi" phu="Radar hẹn bạn đi xem phòng">
      <The style={{ display: "flex", flexDirection: "column", gap: 28, minHeight: 520 }}>
        <BongChat tu="khach" delay={Math.round(fps * 0.6)}>Chào Radar, mình muốn xem phòng. Mã: {MA}</BongChat>
        <BongChat tu="radar" delay={Math.round(fps * 1.8)}>Dạ, Radar sắp lịch xem phòng cho bạn nhé.</BongChat>
      </The>
    </Buoc>
  );
};

const Sfx: React.FC<{ at: number; src: string; volume?: number }> = ({ at, src, volume = 0.6 }) => (
  <Sequence from={Math.max(0, at)} layout="none"><Audio src={staticFile(`sfx/${src}`)} volume={volume} /></Sequence>
);

export type BaBuocProps = { vo?: VoMap };

export const BaBuoc: React.FC<BaBuocProps> = ({ vo = {} }) => {
  const { fps } = useVideoConfig();
  const { len, from } = khungBaBuoc(fps, vo);
  const canh = [Mo, B1, B2, B3, () => <CTA ma={MA} />];
  return (
    <AbsoluteFill>
      <BgMesh />
      {canh.map((C, i) => <Sequence key={i} from={from[i]} durationInFrames={len[i]}><C /></Sequence>)}
      <Grade />
      <Grain />
      <Vignette />
      <Audio src={staticFile("sfx/pad.wav")} volume={nhacNen(vo, 0.22)} loop />
      {CANH.map((c, i) => <Loi key={c} vo={vo[c]} from={from[i]} fps={fps} />)}
      {from.slice(1).map((f) => <Sfx key={f} at={f - 3} src="whoosh.wav" volume={0.45} />)}
      <Sfx at={from[0] + 9 - 2} src="thump.wav" volume={0.7} />
      {[0, 1, 2, 3].map((i) => <Sfx key={`g${i}`} at={from[1] + 14 + i * 5 - 2} src="pop.wav" volume={0.3} />)}
      <Sfx at={from[2] + Math.round(fps * 1.2) - 1} src="pop.wav" volume={0.5} />
      <Sfx at={from[3] + Math.round(fps * 0.6) - 2} src="pop.wav" volume={0.4} />
      <Sfx at={from[3] + Math.round(fps * 1.8) - 2} src="pop.wav" volume={0.4} />
      <Sfx at={from[4] - 1} src="thump.wav" volume={0.8} />
    </AbsoluteFill>
  );
};
