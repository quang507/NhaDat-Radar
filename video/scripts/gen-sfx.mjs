// Tổng hợp bộ SFX tối thiểu thành WAV 16-bit, không tải gì.
import { writeFileSync, mkdirSync } from "node:fs";

const RATE = 44100;
const out = new URL("../public/sfx/", import.meta.url);
mkdirSync(out, { recursive: true });

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;

function wav(name, seconds, fn) {
  const n = Math.round(seconds * RATE);
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(RATE, 24); buf.writeUInt32LE(RATE * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, fn(i / RATE, i / n)));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  writeFileSync(new URL(name, out), buf);
}

// whoosh: nhiễu lọc thông thấp, âm lượng phồng lên rồi tắt
let lp = 0;
wav("whoosh.wav", 0.45, (t, p) => {
  const cutoff = 0.02 + 0.25 * Math.sin(Math.PI * p);
  lp += cutoff * (rnd() - lp);
  return lp * Math.sin(Math.PI * p) ** 2 * 2.2;
});

// pop: sine tụt cao độ nhanh
wav("pop.wav", 0.12, (t) => Math.sin(2 * Math.PI * (900 * t - 2600 * t * t)) * Math.exp(-t * 40) * 0.8);

// thump: kick sine 120→45Hz
wav("thump.wav", 0.5, (t) => {
  const f = 45 + 75 * Math.exp(-t * 25);
  return Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 7) * 0.95;
});

// pad: hợp âm sine lệch tông, fade vào/ra, đủ dài cho cả video
wav("pad.wav", 12, (t) => {
  const notes = [220, 261.63, 329.63, 392];
  let v = 0;
  for (const f of notes) v += Math.sin(2 * Math.PI * f * t) + Math.sin(2 * Math.PI * f * 1.004 * t);
  const env = Math.min(1, t / 1.5) * Math.min(1, (12 - t) / 1.5);
  return (v / notes.length / 2) * env * 0.5;
});
console.log("sfx ok");
