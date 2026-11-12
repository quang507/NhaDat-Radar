import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { escHtml } from "../../src/lib/format";
import { LISTING_PUBLIC_COLS, LISTING_CARD_COLS } from "../../src/lib/cols";
import { chuanHoaSdt, dinhDangSdt, cheSdtDuoi, tenHienThiTaiKhoan, HOTLINE_MASKED } from "../../src/lib/hotline";

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

  const colsSrc = doc("src/lib/cols.ts");
  expect(colsSrc).toContain("export async function truyVanVoiRetry");
  expect(colsSrc).toContain("throw new Error");

  for (const rel of [
    "src/app/page.tsx",
    "src/components/ThematicLanding.tsx",
    "src/components/AreaLanding.tsx",
    "src/app/phong-tro-gan/[diem]/page.tsx",
    "src/app/phong-tro-gan-truong-dai-hoc/[slug]/page.tsx",
  ]) {
    expect(doc(rel), rel).toContain("truyVanVoiRetry");
  }
  expect(doc("src/app/page.tsx")).not.toContain("seed.mjs");

  const uniPage = doc("src/app/phong-tro-gan-truong-dai-hoc/[slug]/page.tsx");
  expect(uniPage).toContain("/nha-dat-cho-thue/ho-chi-minh/");
  expect(uniPage).toContain("/phong-tro/${b.slug}");
});

test("tối ưu mobile INP & chống dead click trên Gallery, ListingCard, SearchClient và globals.css", () => {
  const css = doc("src/app/globals.css");
  expect(css).toContain("touch-action: manipulation");
  expect(css).toContain("background-attachment: scroll");

  const gallery = doc("src/components/Gallery.tsx");
  expect(gallery).toContain("n <= 1");
  expect(gallery).toContain("pointer: coarse");

  const card = doc("src/components/ListingCard.tsx");
  const favIdx = card.indexOf("<FavButton");
  const closeLinkIdx = card.indexOf("</Link>");
  expect(closeLinkIdx).toBeGreaterThan(-1);
  expect(favIdx).toBeGreaterThan(closeLinkIdx);

  const searchClient = doc("src/app/search/SearchClient.tsx");
  expect(searchClient).toContain("const DanhSachTin = memo(");
});

test("canonical, sitemap và robots.txt dùng đúng tên miền live https://www.nhadatradar.com", () => {
  const ld = doc("src/lib/ld.ts");
  expect(ld).toContain('"https://www.nhadatradar.com"');

  for (const rel of ["src/lib/sitemap.ts", "src/app/robots.ts", "src/components/AreaLanding.tsx", "src/middleware.ts"]) {
    const src = doc(rel);
    expect(src, rel).not.toContain('"https://nhadatradar.com"');
  }
});

test("giữ TTL ISR dài (>= 6h-24h) để tránh nổ ISR Writes trên /listings/[id] và trang khu vực", () => {
  const geo = doc("src/lib/geo.ts");
  expect(geo).toContain("getAreasDaily");
  expect(geo).not.toContain("revalidate: 1800");

  const detail = doc("src/app/listings/[id]/page.tsx");
  expect(detail).toContain("getAreasDaily()");
  expect(detail).not.toContain("await getAreas()");

  const priceTrend = doc("src/components/PriceTrend.tsx");
  expect(priceTrend).toContain("revalidate: 86400");

  const home = doc("src/app/page.tsx");
  expect(home).not.toContain("revalidate: 1800");
});

test("luồng Hiện số + Chat qua Zalo + đăng nhập SĐT không OTP kiểu Batdongsan an toàn", () => {
  expect(chuanHoaSdt("+84 909.123.456")).toBe("0909123456");
  expect(dinhDangSdt("0387365020")).toBe("0387 365 020");
  expect(cheSdtDuoi("0387365020")).toBe("0387 365 ***");
  expect(cheSdtDuoi("0866688***")).toBe("0866 688 ***");
  expect(HOTLINE_MASKED).toBe("0387 365 ***");
  expect(tenHienThiTaiKhoan("0909123456@sdt.nhadatradar.local")).toBe("0909 123 456");
  expect(tenHienThiTaiKhoan("user@gmail.com")).toBe("user@gmail.com");

  const authActions = doc("src/app/auth/actions.ts");
  expect(authActions).toContain("xuLyPhienSdt");
  expect(authActions).toContain("signInWithPhone");
  expect(authActions).toContain('p.role === "admin" || p.role === "agent"');
  expect(authActions).toContain("prof.role !== \"user\"");
  expect(authActions).toContain("rateLimitChung");

  const listActions = doc("src/app/listings/actions.ts");
  expect(listActions).toContain("moKhoaLienHeSdt");
  expect(listActions).toContain("laRoHang(tin) || laTinDocQuyen(tin)");
  expect(listActions).toContain('rpc("lay_sdt_tin"');

  const popup = doc("src/components/DangNhapDeXem.tsx");
  expect(popup).toContain("PopupSdtBatdongsan");
  expect(popup).toContain("GhiChuDuLieu");
  expect(popup).toContain("Bảo đảm riêng tư");
  expect(popup).toContain("Đăng nhập bằng Google");
  expect(popup).toContain("dangNhapGoogle");
  expect(popup).not.toContain("Đã dùng tài khoản Google / Email?");

  const cb = doc("src/app/auth/callback/route.ts");
  expect(cb).toContain('dynamic = "force-dynamic"');
  expect(cb).toContain("auth.getUser()");
  expect(cb).toContain("dichLoiAuth");

  const phoneReveal = doc("src/components/PhoneReveal.tsx");
  expect(phoneReveal).toContain("Chat qua Zalo");
  expect(phoneReveal).toContain("Hiện số");
  expect(phoneReveal).toContain("Gọi · Hiện số");
});
