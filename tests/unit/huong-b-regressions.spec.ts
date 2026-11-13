import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// Chốt các quyết định của hướng B (docs/superpowers/specs/2026-11-14-bot-chi-vao-trang-dich-design.md). Chạy không cần mạng.
const ROOT = path.resolve(__dirname, "../..");
const doc = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

test("middleware gọi phaiChan và trả 403 trước mọi việc khác", () => {
  const s = doc("src/middleware.ts");
  expect(s).toContain('from "@/lib/bot"');
  expect(s).toMatch(/phaiChan\(request\.headers\.get\("user-agent"\), request\.nextUrl\.pathname\)/);
  expect(s).toMatch(/status: 403/);
  expect(s.indexOf("phaiChan(")).toBeLessThan(s.indexOf("TEN_MIEN_VERCEL_CU)"));
});

test("robots.txt cấm bot vào trang tin và các trang động, chặn hẳn meta-webindexer", () => {
  const s = doc("src/app/robots.ts");
  for (const p of ['"/listings/"', '"/search"', '"/thong-ke"', '"/auth"', '"/yeu-thich"', '"/agents"', '"/rh/"'])
    expect(s, p).toContain(p);
  expect(s).not.toContain('"/search?"');
  expect(s).toContain('"meta-webindexer"');
  expect(s).not.toContain('"OAI-SearchBot"');
});

test("trang tin mang header X-Robots-Tag: noindex", () => {
  const s = doc("next.config.mjs");
  expect(s).toMatch(/source: "\/listings\/:path\*"[\s\S]{0,120}X-Robots-Tag[\s\S]{0,40}noindex/);
});
