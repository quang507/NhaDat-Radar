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

test("sitemap index chỉ còn khu vực và dự án, không đọc database", () => {
  const s = doc("src/app/sitemap.xml/route.ts");
  expect(s).toContain("sitemap-khu-vuc.xml");
  expect(s).toContain("sitemap-du-an.xml");
  expect(s).not.toContain("sitemap-tin");
  expect(s).not.toContain("thangCoTin");
});

test("sitemap-tin trả 410 và không đọc database", () => {
  const s = doc("src/app/sitemap-tin/[lo]/route.ts");
  expect(s).toMatch(/status: 410/);
  expect(s).not.toMatch(/tinTheoThang|loTin/);
});

test("fetchAreas: lỗi database thì ném, không còn đường trả cây rỗng", () => {
  const s = doc("src/lib/geo.ts");
  expect(s).toContain("kiemCayRpc(");
  expect(s).toMatch(/truyVanVoiRetry\(\(\) => sb\.rpc\("cay_khu_vuc"\)/);
  expect(s).not.toContain("dung lai tranh sap build");
  expect(s).toContain('"areas-v7"');
  expect(s).toContain('"areas-daily-v2"');
});

test("sitemap khu vực: lỗi database trả 503, không trả sitemap rút gọn", () => {
  const s = doc("src/app/sitemap-khu-vuc.xml/route.ts");
  expect(s).toContain("loiTamThoi()");
  expect(s).not.toContain("ít nhất vẫn có trang tĩnh");
});
