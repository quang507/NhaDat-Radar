import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useVideoConfig } from "remotion";
import { theme } from "./theme";
import { BgMesh, Grade, Grain, Vignette } from "./components/Layers";
import { Hook } from "./scenes/Hook";
import { Costs } from "./scenes/Costs";
import { RadarMap } from "./scenes/RadarMap";
import { CTA } from "./scenes/CTA";
import { giayCanh, Loi, nhacNen, VoMap } from "./components/Vo";

const CANH = ["hook", "costs", "map", "cta"] as const;

export const sceneFrames = (fps: number, vo: VoMap = {}) => {
  const s = theme.scenes;
  const len = [s.hook, s.costs, s.map, s.cta].map((x, i) => Math.round(giayCanh(x, vo[CANH[i]]) * fps));
  const from = len.map((_, i) => len.slice(0, i).reduce((a, b) => a + b, 0));
  return { len, from, total: len.reduce((a, b) => a + b, 0) };
};

const Sfx: React.FC<{ at: number; src: string; volume?: number }> = ({ at, src, volume = 0.6 }) => (
  <Sequence from={Math.max(0, at)} layout="none"><Audio src={staticFile(`sfx/${src}`)} volume={volume} /></Sequence>
);

export type PromoProps = { vo?: VoMap };

export const RadarPromo: React.FC<PromoProps> = ({ vo = {} }) => {
  const { fps } = useVideoConfig();
  const { len, from } = sceneFrames(fps, vo);
  const scenes = [Hook, Costs, RadarMap, CTA];
  const rowsAt = from[1] + Math.round(fps * 0.5);
  const pinsAt = from[2] + Math.round(fps * 0.6);
  return (
    <AbsoluteFill>
      <BgMesh />
      {scenes.map((Scene, i) => (
        <Sequence key={i} from={from[i]} durationInFrames={len[i]}><Scene /></Sequence>
      ))}
      <Grade />
      <Grain />
      <Vignette />
      {/* SFX đặt sớm 2-3 khung trước hình */}
      <Audio src={staticFile("sfx/pad.wav")} volume={nhacNen(vo, 0.22)} loop />
      {CANH.map((c, i) => <Loi key={c} vo={vo[c]} from={from[i]} fps={fps} />)}
      {from.slice(1).map((f) => <Sfx key={f} at={f - 3} src="whoosh.wav" volume={0.5} />)}
      <Sfx at={from[0] + Math.round(fps * 1.25) - 2} src="thump.wav" volume={0.7} />
      {[0, 1, 2, 3, 4].map((i) => <Sfx key={`r${i}`} at={rowsAt + i * 5 - 2} src="pop.wav" volume={0.35} />)}
      {[0, 1, 2, 3, 4].map((i) => <Sfx key={`p${i}`} at={pinsAt + i * 5 - 2} src="pop.wav" volume={0.35} />)}
      <Sfx at={from[3] - 1} src="thump.wav" volume={0.8} />
    </AbsoluteFill>
  );
};
