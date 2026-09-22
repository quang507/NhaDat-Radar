import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { escHtml } from "../../src/lib/format";
import { LISTING_PUBLIC_COLS, LISTING_CARD_COLS } from "../../src/lib/cols";

// Chốt các lỗi tìm thấy ở đợt audit 22/9/2026 để không tái phát. Chạy không cần mạng.

const ROOT = path.resolve(__dirname, "../..");
const doc = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");

test("escHtml: thoát đủ ký tự HTML (popup Leaflet nhận chuỗi như innerHTML)", () => {
  expect(escHtml(`<img src=x onerror="alert(1)">`)).toBe("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  expect(escHtml("Nhà 5 tỷ & 'đẹp'")).toBe("Nhà 5 tỷ &amp; &#39;đẹp&#39;");
  expect(escHtml(null)).toBe("");
  expect(escHtml(undefined)).toBe("");
});

test("popup bản đồ không nội suy chuỗi thô vào bindPopup / divIcon", () => {
  for (const f of ["src/components/ListingMap.tsx", "src/components/PriceMap.tsx", "src/components/MapResults.tsx"]) {
    const s = doc(f);
    expect(s, f).toContain("escHtml");
    expect(s, f).not.toMatch(/bindPopup\(title\)/);
    expect(s, f).not.toMatch(/\$\{p\.sub \|\| ""\}/);
  }
});

test("cột đọc bằng anon không chứa contact_phone (migration 026 thu quyền anon)", () => {
  const cols = (s: string) => s.split(",");
  expect(cols(LISTING_PUBLIC_COLS)).not.toContain("contact_phone");
  expect(cols(LISTING_CARD_COLS)).not.toContain("contact_phone");
  expect(doc("src/app/listings/[id]/page.tsx")).not.toMatch(/select\(LISTING_COLS\)/);
});

test("zalo-bot: mọi hằng *_TTL_MS được dùng đều đã khai báo (XEM_TTL_MS từng thiếu -> ReferenceError)", () => {
  const s = doc("crawler/zalo-bot.mjs");
  const dung = new Set([...s.matchAll(/\b([A-Z][A-Z0-9]*_TTL_MS)\b/g)].map((m) => m[1]));
  const khai = new Set([...s.matchAll(/\b(?:const|let|var)\s+([A-Z][A-Z0-9]*_TTL_MS)\b/g)].map((m) => m[1]));
  const thieu = [...dung].filter((n) => !khai.has(n));
  expect(thieu).toEqual([]);
});

test("migration 025 (CRM: tên/SĐT khách) bật RLS cho cả 6 bảng", () => {
  const s = doc("supabase/migrations/025_crm_core.sql");
  for (const t of ["buyers", "sellers", "interests", "deals", "viewings", "reminders"]) {
    expect(s, t).toMatch(new RegExp(`alter table public\\.${t}\\s+enable row level security`));
  }
});

test("schema.sql không còn đọc role từ metadata client lúc đăng ký", () => {
  expect(doc("supabase/schema.sql")).not.toMatch(/raw_user_meta_data->>'role'/);
});
