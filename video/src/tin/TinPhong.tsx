import React from "react";
import {
  AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig,
} from "remotion";
import { theme } from "../theme";
import { BgMesh, Grade, Grain, Vignette } from "../components/Layers";
import { clamp, Entrance, SceneExit, WordReveal, useBreathe } from "../components/Motion";
import { khungTin, TinProps } from "./types";
import { Loi, nhacNen } from "../components/Vo";

const font = theme.fonts.body;

// Ken Burns theo độ dài của chính cảnh (useVideoConfig trong Sequence trả độ dài cả video)
const AnhKenBurns: React.FC<{ src: string; dur: number; zoomVao: boolean; mo?: number }> = ({ src, dur, zoomVao, mo = 0 }) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, dur], [0, 1], { easing: theme.ease.inOut, ...clamp });
  const scale = zoomVao ? 1 + 0.1 * t : 1.1 - 0.1 * t;
  const pan = interpolate(t, [0, 1], zoomVao ? [0, -24] : [-24, 0]);
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover",
        transform: `scale(${scale}) translateX(${pan}px)`, filter: mo ? `blur(${mo}px) brightness(0.35)` : "saturate(1.08) contrast(1.05)" }} />
    </AbsoluteFill>
  );
};

// Ảnh mới đè lên ảnh cũ: phóng nhẹ xuống + hiện dần (scale-through), 8 khung
const VaoAnh: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const len = Math.round(fps * 0.27);
  const o = interpolate(frame, [0, len], [0, 1], { easing: theme.ease.out, ...clamp });
  const s = interpolate(frame, [0, len], [1.12, 1], { easing: theme.ease.out, ...clamp });
  const b = interpolate(frame, [0, len], [10, 0], { easing: theme.ease.out, ...clamp });
  return <AbsoluteFill style={{ opacity: o, transform: `scale(${s})`, filter: `blur(${b}px)` }}>{children}</AbsoluteFill>;
};

// Lớp tối dưới chân ảnh cho chữ dễ đọc
const ToiChan: React.FC<{ manh?: number }> = ({ manh = 0.92 }) => (
  <AbsoluteFill style={{ background: `linear-gradient(180deg, rgba(11,18,32,0.55) 0%, transparent 18%, transparent 42%, rgba(11,18,32,${manh}) 78%, ${theme.colors.bg} 100%)` }} />
);

const Chip: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div style={{ display: "inline-flex", alignItems: "center", gap: 12, padding: "12px 22px", borderRadius: theme.radius,
    background: "rgba(11,18,32,0.72)", border: `1px solid ${theme.colors.line}`, color: theme.colors.text,
    fontFamily: font, fontWeight: 600, fontSize: 30, letterSpacing: "0.04em", ...style }}>{children}</div>
);

const Hero: React.FC<{ p: TinProps; dur: number }> = ({ p, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const giaP = spring({ frame: frame - 16, fps, config: theme.spring.bouncy });
  const tieuDe = [p.loai, p.dienTich ? `${p.dienTich}m²` : null].filter(Boolean).join(" ");
  return (
    <AbsoluteFill>
      <AnhKenBurns src={p.anh[0]} dur={dur} zoomVao />
      <ToiChan />
      <AbsoluteFill style={{ justifyContent: "flex-end", padding: "0 80px 300px", fontFamily: font }}>
        <Entrance delay={2}>
          <Chip style={{ marginBottom: 30 }}>{p.deal === "cho_thue" ? "CHO THUÊ" : "BÁN"} · {p.quan.toUpperCase()}</Chip>
        </Entrance>
        <WordReveal text={tieuDe} delay={5} style={{ fontWeight: 800, fontSize: 132, letterSpacing: "-0.04em", lineHeight: 1.02, color: theme.colors.text }} />
        <Entrance delay={10}>
          <div style={{ fontSize: 42, fontWeight: 600, color: theme.colors.textDim, marginTop: 18 }}>{p.khuVuc}</div>
        </Entrance>
        <div style={{ marginTop: 40, display: "flex", alignItems: "baseline", gap: 16, opacity: giaP,
          transform: `translateY(${interpolate(giaP, [0, 1], [30, 0])}px) scale(${interpolate(giaP, [0, 1], [0.9, 1])})`, transformOrigin: "left bottom" }}>
          <span style={{ fontSize: 120, fontWeight: 800, letterSpacing: "-0.04em", color: theme.colors.primary,
            textShadow: `0 0 60px ${theme.colors.glow}` }}>{p.gia.so}</span>
          <span style={{ fontSize: 44, fontWeight: 600, color: theme.colors.text }}>{p.gia.donVi}</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Nhãn trên từng ảnh phụ: lần lượt các thông tin có thật của tin
const nhanAnh = (p: TinProps) => [
  p.dienTich ? `${p.dienTich} m²` : null,
  p.noiThat ? `Nội thất ${p.noiThat.toLowerCase()}` : null,
  p.phongNgu ? `${p.phongNgu} phòng ngủ` : null,
  p.khuVuc,
  p.coc ? `Cọc ${p.coc}` : null,
].filter((x): x is string => !!x);

const AnhPhu: React.FC<{ p: TinProps; i: number; dur: number }> = ({ p, i, dur }) => {
  const nhan = nhanAnh(p);
  return (
    <VaoAnh>
      <AnhKenBurns src={p.anh[i]} dur={dur} zoomVao={i % 2 === 0} />
      <ToiChan manh={0.6} />
      <AbsoluteFill style={{ justifyContent: "flex-end", padding: "0 80px 330px" }}>
        <Entrance delay={5}>
          <div style={{ fontFamily: font, fontWeight: 800, fontSize: 64, letterSpacing: "-0.03em", color: theme.colors.text,
            textShadow: "0 4px 30px rgba(0,0,0,0.6)" }}>{nhan[(i - 1) % nhan.length]}</div>
        </Entrance>
      </AbsoluteFill>
    </VaoAnh>
  );
};

// Thanh cố định khi đang chiếu ảnh: thương hiệu + mã phòng + số ảnh
const ThanhAnh: React.FC<{ p: TinProps; k: ReturnType<typeof khungTin> }> = ({ p, k }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const vao = spring({ frame: frame - 8, fps, config: theme.spring.smooth });
  const thu = Math.round(fps / 3);
  const ra = interpolate(frame, [k.tuPhi - thu, k.tuPhi - 1], [1, 0], { easing: theme.ease.in, ...clamp });
  const so = frame < k.tuAnh ? 1 : Math.min(p.anh.length, 2 + Math.floor((frame - k.tuAnh) / k.anh));
  return (
    <AbsoluteFill style={{ opacity: vao * ra, fontFamily: font }}>
      <div style={{ position: "absolute", top: 150, left: 80, right: 80, display: "flex", justifyContent: "space-between", alignItems: "center",
        transform: `translateY(${interpolate(vao, [0, 1], [-30, 0])}px)` }}>
        <Chip style={{ fontSize: 34, fontWeight: 800, letterSpacing: "-0.02em" }}>
          <span>nhadat<span style={{ color: theme.colors.textDim }}>radar</span></span>
        </Chip>
        <Chip style={{ fontVariantNumeric: "tabular-nums" }}>{so}/{p.anh.length}</Chip>
      </div>
      <div style={{ position: "absolute", bottom: 200, left: 80, transform: `translateY(${interpolate(vao, [0, 1], [30, 0])}px)` }}>
        <Chip style={{ fontVariantNumeric: "tabular-nums" }}>Mã phòng: {p.ma}</Chip>
      </div>
    </AbsoluteFill>
  );
};

const BangPhi: React.FC<{ p: TinProps }> = ({ p }) => {
  const { fps } = useVideoConfig();
  const dong: [string, string, boolean][] = [
    ["Tiền phòng", `${p.gia.so} ${p.gia.donVi.replace("/tháng", "")}`, true],
    ...p.phi.map(([a, b]) => [a, b, false] as [string, string, boolean]),
    ...(p.coc ? [["Đặt cọc", p.coc, false] as [string, string, boolean]] : []),
  ];
  const vao = Math.round(fps * 0.45);
  return (
    <SceneExit>
      <AbsoluteFill style={{ justifyContent: "center", padding: "0 80px", fontFamily: font }}>
        <WordReveal text="Chi phí rõ ràng." delay={2} style={{ fontWeight: 800, fontSize: 100, letterSpacing: "-0.04em", color: theme.colors.text }} />
        <Entrance delay={8}>
          <div style={{ fontSize: 38, color: theme.colors.textDim, margin: "14px 0 54px" }}>Theo thông tin chủ nhà, phòng {p.ma}</div>
        </Entrance>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {dong.map(([nhan, giaTri, chinh], i) => (
            <Entrance key={nhan} delay={vao + i * 5}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 30,
                padding: "32px 36px", background: "rgba(17,28,46,0.88)", borderRadius: theme.radius, border: `1px solid ${theme.colors.line}` }}>
                <span style={{ fontSize: 42, fontWeight: 600, color: chinh ? theme.colors.text : theme.colors.textDim }}>{nhan}</span>
                <span style={{ fontSize: chinh ? 56 : 42, fontWeight: chinh ? 800 : 600, letterSpacing: "-0.01em",
                  color: chinh ? theme.colors.primary : theme.colors.text, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{giaTri}</span>
              </div>
            </Entrance>
          ))}
        </div>
      </AbsoluteFill>
    </SceneExit>
  );
};

const KetThuc: React.FC<{ p: TinProps }> = ({ p }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const maP = spring({ frame: frame - 12, fps, config: theme.spring.bouncy });
  const breathe = useBreathe(18, 0.014);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", fontFamily: font, padding: "0 80px", textAlign: "center" }}>
      <WordReveal text="Muốn xem phòng này?" delay={2} style={{ justifyContent: "center", fontWeight: 800, fontSize: 92,
        letterSpacing: "-0.04em", lineHeight: 1.05, color: theme.colors.text }} />
      <Entrance delay={8}>
        <div style={{ fontSize: 40, color: theme.colors.textDim, marginTop: 30 }}>Nhắn Zalo Radar, gửi kèm mã</div>
      </Entrance>
      <div style={{ marginTop: 36, padding: "28px 56px", borderRadius: theme.radius, border: `3px solid ${theme.colors.primary}`,
        background: "rgba(16,185,129,0.08)", boxShadow: `0 0 70px ${theme.colors.glow}`, opacity: maP,
        transform: `scale(${interpolate(maP, [0, 1], [0.7, 1]) * breathe})` }}>
        <span style={{ fontSize: 104, fontWeight: 800, letterSpacing: "0.06em", color: theme.colors.primary, fontVariantNumeric: "tabular-nums" }}>{p.ma}</span>
      </div>
      <Entrance delay={22}>
        <div style={{ marginTop: 70, fontSize: 36, color: theme.colors.textDim, letterSpacing: "0.12em" }}>ZALO / HOTLINE</div>
      </Entrance>
      <Entrance delay={26}>
        <div style={{ marginTop: 10, fontSize: 76, fontWeight: 800, letterSpacing: "-0.01em", color: theme.colors.text, fontVariantNumeric: "tabular-nums" }}>{p.hotline}</div>
      </Entrance>
      <Entrance delay={32}>
        <div style={{ marginTop: 60, fontSize: 38, fontWeight: 600, color: theme.colors.textDim }}>nhadatradar.com</div>
      </Entrance>
    </AbsoluteFill>
  );
};

const Sfx: React.FC<{ at: number; src: string; volume?: number }> = ({ at, src, volume = 0.6 }) => (
  <Sequence from={Math.max(0, at)} layout="none"><Audio src={staticFile(`sfx/${src}`)} volume={volume} /></Sequence>
);

export const TinPhong: React.FC<TinProps> = (p) => {
  const { fps } = useVideoConfig();
  const k = khungTin(p, fps);
  if (!p.anh.length) {
    return <AbsoluteFill style={{ background: theme.colors.bg, color: theme.colors.text, fontFamily: font, fontSize: 40,
      alignItems: "center", justifyContent: "center", padding: 80, textAlign: "center" }}>Chạy node scripts/lay-tin.mjs &lt;id&gt; để có dữ liệu tin</AbsoluteFill>;
  }
  const soDongPhi = p.phi.length + 1 + (p.coc ? 1 : 0);
  return (
    <AbsoluteFill style={{ background: theme.colors.bg }}>
      <Sequence durationInFrames={k.tuPhi}><BgMesh /></Sequence>
      <Sequence durationInFrames={k.hero + 1}><Hero p={p} dur={k.hero} /></Sequence>
      {Array.from({ length: k.soAnhPhu }).map((_, j) => (
        <Sequence key={j} from={k.tuAnh + j * k.anh} durationInFrames={k.anh + (j === k.soAnhPhu - 1 ? 0 : 1)}>
          <AnhPhu p={p} i={j + 1} dur={k.anh} />
        </Sequence>
      ))}
      <Sequence durationInFrames={k.tuPhi}><ThanhAnh p={p} k={k} /></Sequence>
      {k.phi > 0 && (
        <Sequence from={k.tuPhi} durationInFrames={k.phi}>
          <AnhKenBurns src={p.anh[p.anh.length - 1]} dur={k.phi} zoomVao mo={28} />
          <BangPhi p={p} />
        </Sequence>
      )}
      <Sequence from={k.tuCta} durationInFrames={k.cta}><BgMesh /><KetThuc p={p} /></Sequence>
      <Grade />
      <Grain />
      <Vignette />
      {/* âm thanh: SFX sớm 2-3 khung trước hình */}
      <Audio src={staticFile("sfx/pad.wav")} volume={nhacNen(p.vo, 0.2)} loop />
      <Loi vo={p.vo?.hero} from={0} fps={fps} />
      {k.soAnhPhu > 0 && <Loi vo={p.vo?.anh} from={k.tuAnh} fps={fps} />}
      {k.phi > 0 && <Loi vo={p.vo?.phi} from={k.tuPhi} fps={fps} />}
      <Loi vo={p.vo?.cta} from={k.tuCta} fps={fps} />
      <Sfx at={14} src="thump.wav" volume={0.6} />
      {Array.from({ length: k.soAnhPhu }).map((_, j) => <Sfx key={`a${j}`} at={k.tuAnh + j * k.anh - 3} src="whoosh.wav" volume={0.4} />)}
      {k.phi > 0 && <Sfx at={k.tuPhi - 3} src="whoosh.wav" volume={0.5} />}
      {k.phi > 0 && Array.from({ length: soDongPhi }).map((_, i) => (
        <Sfx key={`p${i}`} at={k.tuPhi + Math.round(fps * 0.45) + i * 5 - 2} src="pop.wav" volume={0.35} />
      ))}
      <Sfx at={k.tuCta - 3} src="whoosh.wav" volume={0.5} />
      <Sfx at={k.tuCta + 10} src="thump.wav" volume={0.8} />
    </AbsoluteFill>
  );
};
