// Kiểm tra vi phạm design system ZEN Kaiz (CLAUDE.md mục 3, tailwind.config.ts, globals.css).
//
//   node scripts/kiem-tra-ui.mjs --hook          hook PostToolUse của Claude Code: đọc JSON từ stdin, chỉ soi
//                                                ĐOẠN VỪA VIẾT (new_string / content) để không nhắc lại nợ cũ
//   node scripts/kiem-tra-ui.mjs [file...]       soi cả file
//   node scripts/kiem-tra-ui.mjs --all           thống kê toàn bộ src/ (đo nợ thiết kế theo thời gian)
//
// Chỉ CẢNH BÁO, không chặn: nhiều chỗ cũ có lý do riêng (ảnh nền tối, nhãn đè ảnh...).
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";

const LUAT = [
  {
    ma: "bo-goc-tuy-y",
    re: /\brounded(?:-[trblxy]{1,2})?-\[[^\]]+\]/g,
    loi: "bo góc tuỳ ý - chỉ dùng rounded-xs/sm/md (2-4px) hoặc rounded-full cho avatar/chấm; muốn đổi thì sửa tailwind.config.ts",
  },
  {
    ma: "mau-hex",
    re: /\b(?:bg|text|border|ring|fill|stroke|from|via|to|outline|decoration|shadow)-\[#[0-9a-fA-F]{3,8}\]/g,
    loi: "mã màu cứng - dùng token: bg-brand / text-brand / var(--ink|--ink-soft|--surface|--line) / accent",
  },
  {
    ma: "mau-cam",
    re: /\b(?:bg|text|border|ring|from|via|to|fill|stroke)-(?:purple|pink|violet|fuchsia)-\d{2,3}\b/g,
    loi: "tím/hồng/violet/fuchsia bị cấm (CLAUDE.md mục 3) - dùng Emerald brand hoặc Slate",
  },
  {
    ma: "kinh-mo",
    re: /\bbackdrop-blur(?:-[a-z0-9]+)?\b/g,
    loi: "backdrop-blur (glassmorphism) - ZEN dùng nền đặc: bg-black/60 cho nhãn trên ảnh, var(--surface) cho panel",
  },
  {
    ma: "co-chu-tuy-y",
    re: /\btext-\[\d*\.?\d+(?:px|rem)\]/g,
    loi: "cỡ chữ tuỳ ý - dùng thang ZEN: text-overline(11px) / text-caption(12px) / text-body-sm(14px) / text-body / text-h1..h4",
  },
  {
    ma: "mau-tho",
    re: /\b(?:bg-white|bg-slate-\d{2,3}|text-slate-\d{2,3}|border-slate-\d{2,3})\b/g,
    loi: "màu Slate thô (phải tự viết dark:) - dùng biến theo theme: bg-[var(--surface)] / bg-[var(--surface-2)] / text-[var(--ink)] / text-[var(--ink-soft)] / text-[var(--ink-faint)] / border-[var(--line)]",
  },
];

const DUOI = new Set([".tsx", ".ts", ".jsx", ".css"]);

function soi(text) {
  const ket = [];
  const dong = text.split(/\r?\n/);
  dong.forEach((d, i) => {
    for (const l of LUAT) {
      for (const m of d.matchAll(l.re)) ket.push({ ma: l.ma, dong: i + 1, khop: m[0] });
    }
  });
  return ket;
}

function gom(ket) {
  const theoLuat = new Map();
  for (const k of ket) {
    const ds = theoLuat.get(k.ma) || [];
    ds.push(k);
    theoLuat.set(k.ma, ds);
  }
  return [...theoLuat].map(([ma, ds]) => {
    const l = LUAT.find((x) => x.ma === ma);
    const vd = [...new Set(ds.map((d) => d.khop))].slice(0, 4).join(", ");
    return `- ${ds.length}× ${vd}: ${l.loi}`;
  });
}

function duyet(thuMuc, ra = []) {
  for (const ten of readdirSync(thuMuc)) {
    const p = join(thuMuc, ten);
    if (statSync(p).isDirectory()) duyet(p, ra);
    else if (DUOI.has(extname(p))) ra.push(p);
  }
  return ra;
}

const args = process.argv.slice(2);

if (args[0] === "--hook") {
  let raw = "";
  for await (const c of process.stdin) raw += c;
  let inp;
  try { inp = JSON.parse(raw); } catch { process.exit(0); }
  const ti = inp.tool_input || {};
  const file = String(ti.file_path || "");
  // chỉ code giao diện trong src/ (bỏ qua script crawler, tailwind.config, globals.css - nơi định nghĩa token)
  if (!/[\\/]src[\\/]/.test(file) || !DUOI.has(extname(file)) || /globals\.css$/.test(file)) process.exit(0);
  const moi = ti.new_string ?? ti.content ?? (ti.edits || []).map((e) => e.new_string).join("\n");
  const ket = soi(moi || "");
  if (!ket.length) process.exit(0);
  const loi = gom(ket);
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PostToolUse",
      additionalContext: `[kiem-tra-ui] Đoạn vừa sửa trong ${file.split(/[\\/]/).slice(-2).join("/")} lệch design system ZEN Kaiz:\n${loi.join("\n")}\nSửa lại nếu không có lý do riêng (xem skill radar-ui).`,
    },
  }));
  process.exit(0);
}

const goc = process.cwd();
const tep = args[0] === "--all" || !args.length ? duyet(join(goc, "src")) : args;
const tong = new Map(LUAT.map((l) => [l.ma, 0]));
const theoTep = [];
for (const f of tep) {
  const ket = soi(readFileSync(f, "utf8"));
  for (const k of ket) tong.set(k.ma, tong.get(k.ma) + 1);
  if (ket.length) theoTep.push([relative(goc, f), ket.length, ket]);
}

if (args[0] === "--all" || !args.length) {
  console.log(`Nợ design system trong src/ (${tep.length} tệp):`);
  for (const l of LUAT) console.log(`  ${l.ma.padEnd(14)} ${String(tong.get(l.ma)).padStart(5)}`);
  console.log("\nTệp nhiều nhất:");
  for (const [f, n] of theoTep.sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(`  ${String(n).padStart(4)}  ${f}`);
} else {
  for (const [f, , ket] of theoTep) {
    console.log(f);
    for (const k of ket) console.log(`  ${k.dong}: ${k.khop}  (${k.ma})`);
  }
  if (!theoTep.length) console.log("Không thấy vi phạm.");
}
