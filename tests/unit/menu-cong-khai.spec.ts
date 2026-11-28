import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

// 28/11: mục "Người Bán" (/agents) chỉ admin thấy - bỏ khỏi menu công khai, vào từ tab admin "Môi giới & Chủ nhà".
const ROOT = path.resolve(__dirname, "../..");
const doc = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

test("menu công khai (desktop + điện thoại) không còn link Người Bán", () => {
  for (const f of ["src/components/Nav.tsx", "src/components/MobileMenu.tsx"]) {
    const s = doc(f);
    expect(s, f).not.toContain('"/agents"');
    expect(s, f).not.toContain("Người Bán");
  }
});

test("tab admin Môi giới & Chủ nhà có link sang trang /agents", () => {
  const s = doc("src/app/admin/page.tsx");
  const i = s.indexOf('if (tab === "agents")');
  expect(i).toBeGreaterThan(0);
  expect(s.slice(i, i + 2500)).toContain('href="/agents"');
});
