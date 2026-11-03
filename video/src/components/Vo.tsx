// Lồng tiếng: file do scripts/long-tieng.mjs tạo (public/vo/<bộ>/vo.json). Thiếu file thì video chạy không lời.
import React from "react";
import { Audio, Sequence, staticFile } from "remotion";

export type VoClip = { src: string; giay: number };
export type VoMap = Record<string, VoClip>;

// Lời vào sau đầu cảnh một nhịp ngắn (chữ hiện trước), và chừa đuôi để cảnh không cắt ngang câu
const TRE = 0.2;
const DUOI = 0.5;

/** Độ dài cảnh (giây): không ngắn hơn nhịp gốc, đủ chỗ cho lời đọc */
export const giayCanh = (coBan: number, vo?: VoClip) => Math.max(coBan, vo ? TRE + vo.giay + DUOI : 0);

export const napVo = async (bo: string): Promise<VoMap> => {
  try {
    const r = await fetch(staticFile(`vo/${bo}/vo.json`));
    return r.ok ? await r.json() : {};
  } catch {
    return {};
  }
};

export const Loi: React.FC<{ vo?: VoClip; from: number; fps: number }> = ({ vo, from, fps }) =>
  vo ? (
    <Sequence from={from + Math.round(TRE * fps)} layout="none">
      <Audio src={staticFile(vo.src)} volume={1} />
    </Sequence>
  ) : null;

/** Nhạc nền nhỏ lại khi có lời */
export const nhacNen = (vo: VoMap | undefined, goc: number) => (vo && Object.keys(vo).length ? goc * 0.55 : goc);
