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

test("rổ hàng EvoHome không ghi cột generated của listings (price_per_m2 từng làm upsert chết, 0 phòng lên web)", () => {
  const s = doc("crawler/ro-hang-evohome.mjs");
  for (const c of ["price_per_m2", "has_contact_phone"]) expect(s, c).not.toMatch(new RegExp(`\\b${c}\\s*:`));
});

test("trang SEO động có generateStaticParams + revalidate để giữ cache ISR (docs/AUDIT-SEO-2026-11.md §2.2)", () => {
  const ROUTE_ISR = [
    "src/app/listings/[id]/page.tsx",
    "src/app/projects/[id]/page.tsx",
    "src/app/nha-dat-ban/[province]/page.tsx",
    "src/app/nha-dat-ban/[province]/[district]/page.tsx",
    "src/app/nha-dat-ban/[province]/[district]/[kind]/page.tsx",
    "src/app/nha-dat-cho-thue/[province]/page.tsx",
    "src/app/nha-dat-cho-thue/[province]/[district]/page.tsx",
    "src/app/nha-dat-cho-thue/[province]/[district]/[kind]/page.tsx",
    "src/app/nha-dat-cho-thue/[province]/[district]/[kind]/[bo-loc]/page.tsx",
    "src/app/nha-dat-cho-thue/[province]/[district]/[kind]/trang/[n]/page.tsx",
    "src/app/phong-tro-gan/[diem]/page.tsx",
    "src/app/phong-tro-gan-truong-dai-hoc/[slug]/page.tsx",
    "src/app/tin-tuc/[slug]/page.tsx",
  ];
  for (const f of ROUTE_ISR) {
    const s = doc(f);
    expect(s, f).toMatch(/export\s+const\s+revalidate\s*=\s*\d+/);
    expect(s, f).toMatch(/export\s+async\s+function\s+generateStaticParams/);
    expect(s, f).not.toMatch(/export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/);
  }
});

test("các trang SEO tĩnh (kể cả Hub /nha-dat-ban & /nha-dat-cho-thue) không đọc searchParams hay force-dynamic", () => {
  const PHAI_TINH = [
    "src/app/page.tsx",
    "src/app/nha-dat-ban/page.tsx",
    "src/app/nha-dat-cho-thue/page.tsx",
    "src/app/dinh-gia/page.tsx",
    "src/app/phong-tro-duoi-3-trieu/page.tsx",
    "src/app/phong-tro-co-gac-lung/page.tsx",
    "src/app/can-ho-mini-full-noi-that/page.tsx",
    "src/app/tin-tuc/page.tsx",
  ];
  for (const f of PHAI_TINH) {
    const s = doc(f);
    expect(s, f).toMatch(/export\s+const\s+revalidate\s*=\s*\d+/);
    expect(s, f).not.toMatch(/export\s+const\s+dynamic\s*=\s*["']force-dynamic["']/);
    expect(s, f).not.toMatch(/\bsearchParams\b/);
  }
});

test("kiểm chứng prerender-manifest sau build: trang SEO giữ chế độ Static/ISR", () => {
  test.skip(!fs.existsSync(path.join(ROOT, ".next/prerender-manifest.json")), "chưa có bản build .next");
  const m = JSON.parse(fs.readFileSync(path.join(ROOT, ".next/prerender-manifest.json"), "utf8"));
  for (const r of ["/", "/nha-dat-ban", "/nha-dat-cho-thue", "/dinh-gia", "/phong-tro-duoi-3-trieu", "/phong-tro-co-gac-lung", "/can-ho-mini-full-noi-that", "/phong-tro-gan-truong-dai-hoc", "/tin-tuc"]) {
    expect(m.routes[r], r).toBeTruthy();
  }
  for (const r of [
    "/listings/[id]",
    "/nha-dat-cho-thue/[province]/[district]",
    "/nha-dat-cho-thue/[province]/[district]/[kind]/[bo-loc]",
    "/nha-dat-cho-thue/[province]/[district]/[kind]/trang/[n]",
    "/phong-tro-gan-truong-dai-hoc/[slug]",
    "/tin-tuc/[slug]",
  ]) {
    expect(m.dynamicRoutes[r], r).toBeTruthy();
  }
});

test("layBiaMo chỉ lấy đúng 4 cột khu vực với status='gone' khi dùng admin client (không lộ nội dung/SĐT tin ẩn)", () => {
  const s = doc("src/app/listings/[id]/page.tsx");
  expect(s).toMatch(/\.from\("listings"\)\s*\.select\("deal,kind,province,district"\)\.eq\("id",\s*id\)\.eq\("status",\s*"gone"\)/);
});

test("trang chủ và menu không dẫn danh mục chính vào /search?kind= hay /search?deal= (docs/AUDIT-SEO-2026-11.md §2.1)", () => {
  const home = doc("src/app/page.tsx");
  expect(home).not.toContain("/search?kind=");
  const menu = doc("src/components/MobileMenu.tsx");
  expect(menu).not.toContain("/search?deal=");
  const footer = doc("src/components/Footer.tsx");
  expect(footer).not.toContain("/search");
});

test("/search luôn noindex, follow để không cạnh tranh trang khu vực & hub", () => {
  const searchPage = doc("src/app/search/page.tsx");
  expect(searchPage).toMatch(/robots:\s*\{\s*index:\s*false,\s*follow:\s*true\s*\}/);
  expect(searchPage).not.toMatch(/index:\s*true/);
});

test("trang điểm neo pSEO có đủ 16 điểm TP.HCM & trang đại học trỏ bộ lọc tĩnh cấp quận", () => {
  const diemNeoSrc = doc("src/lib/diem-neo.ts");
  const slugMatches = diemNeoSrc.match(/slug:\s*"[a-z0-9-]+"/g) ?? [];
  expect(slugMatches.length).toBe(16);

  const diemPage = doc("src/app/phong-tro-gan/[diem]/page.tsx");
  expect(diemPage).toContain("truyVanVoiRetry");
  expect(diemPage).toContain("throw new Error");

  const uniPage = doc("src/app/phong-tro-gan-truong-dai-hoc/[slug]/page.tsx");
  expect(uniPage).toContain("/nha-dat-cho-thue/ho-chi-minh/");
  expect(uniPage).toContain("/phong-tro/${b.slug}");
});
