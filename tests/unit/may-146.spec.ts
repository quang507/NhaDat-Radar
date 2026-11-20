import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// 20/11/2026: Vercel khoá dự án (Hobby, vượt Active CPU / ISR Writes / Fast Origin Transfer) -> web chạy tự host trên máy 146.
// Chốt các điểm dễ vỡ của cách chạy mới. Chạy không cần mạng.

const goc = path.join(__dirname, "../..");
const doc = (p: string) => fs.readFileSync(path.join(goc, p), "utf8");

test("next.config: nhadatradar.com (không www) chuyển vĩnh viễn về www, giữ nguyên đường dẫn", () => {
  const s = doc("next.config.mjs");
  expect(s).toMatch(/source: "\/:path\*", has: \[\{ type: "host", value: "nhadatradar\.com" \}\], destination: "https:\/\/www\.nhadatradar\.com\/:path\*", permanent: true/);
});

test("deploy/may-146: server chỉ nghe 127.0.0.1 và tự chạy lại; deploy tự trả bản cũ khi build lỗi", () => {
  const cmd = doc("deploy/may-146/radar_web.cmd");
  expect(cmd).toContain("-H 127.0.0.1");
  expect(cmd).toContain("-p 3000");
  expect(cmd).toMatch(/goto loop/);
  const ps = doc("deploy/may-146/deploy_web.ps1");
  expect(ps).toContain(".next-prev");          // bản sao lưu để trả lại
  expect(ps).toContain("BaoTelegram");
  expect(ps).toContain("Global\\RadarWebDeploy"); // khoá chống hai lượt deploy chồng nhau
  // danh sách file web phải khớp scripts/vercel-bo-qua.sh (đổi crawler/docs thì không build)
  const bo = doc("scripts/vercel-bo-qua.sh");
  const re = (ps.match(/-match '(\^\(src\/[^']+)'/) || [])[1];
  expect(re, "không đọc được regex file web trong deploy_web.ps1").toBeTruthy();
  const web = new RegExp(re);
  for (const p of ["src/app/page.tsx", "public/sw.js", "data/x.json", "next.config.mjs", "package.json", "package-lock.json", "tailwind.config.ts", "postcss.config.mjs", "tsconfig.json", "next-env.d.ts"]) expect(web.test(p), p).toBe(true);
  for (const p of ["crawler/daily.mjs", "docs/x.md", "tests/unit/a.spec.ts", "deploy/may-146/README.md", ".github/workflows/daily-crawl.yml"]) expect(web.test(p), p).toBe(false);
  // cùng danh sách với scripts/vercel-bo-qua.sh
  for (const m of ["src", "public", "data", "next.config.mjs", "package.json", "package-lock.json", "tailwind.config.ts", "postcss.config.mjs", "tsconfig.json"]) expect(bo, "vercel-bo-qua.sh thiếu " + m).toContain(m);
});

test("CLAUDE.md ghi hosting mới, không còn dặn 'Vercel tự deploy'", () => {
  const c = doc("CLAUDE.md");
  expect(c).toContain("deploy/may-146/README.md");
  expect(c).not.toMatch(/Vercel tự động build và deploy lên production/);
});
