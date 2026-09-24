import { test, expect, Page } from "@playwright/test";

// Smoke: mọi trang chính phải mở được, có nội dung, không lỗi JS nghiêm trọng.

const PAGES: { path: string; mustSee: RegExp }[] = [
  { path: "/", mustSee: /nhà|căn hộ|bất động sản/i },
  { path: "/search", mustSee: /tìm|lọc|kết quả/i },
  { path: "/agents", mustSee: /người bán|môi giới/i },
  { path: "/thong-ke", mustSee: /giá|thống kê/i },
  { path: "/tinh-lai-vay", mustSee: /lãi vay|khoản vay/i },
  { path: "/thue-hay-mua", mustSee: /thuê|mua/i },
  { path: "/auth", mustSee: /đăng nhập|đăng ký/i },
  { path: "/ban", mustSee: /đăng bán|đăng tin/i },
  { path: "/yeu-thich", mustSee: /yêu thích|đã lưu|chưa lưu/i },
  { path: "/huong-dan/mua", mustSee: /bước|hướng dẫn/i },
  { path: "/huong-dan/ban", mustSee: /bước|hướng dẫn/i },
];

function collectPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  return errors;
}

for (const { path, mustSee } of PAGES) {
  test(`trang ${path} mở được và có nội dung`, async ({ page }) => {
    const errors = collectPageErrors(page);
    const resp = await page.goto(path);
    expect(resp?.status(), `${path} phải trả HTTP 200`).toBe(200);
    await expect(page.locator("body")).toContainText(mustSee, { timeout: 15_000 });
    expect(errors, `lỗi JS trên ${path}: ${errors.join("; ")}`).toEqual([]);
  });
}

test("SEO: sitemap index + các sitemap con + robots.txt", async ({ request }) => {
  // 23/9: /sitemap.xml đổi từ MỘT file (cắt cứng 1.000 tin) sang sitemap INDEX trỏ tới các file con,
  // nhờ đó khai báo được toàn bộ tin thay vì 15% như trước.
  // Job E2E chạy trên PRODUCTION (xem e2e.yml), nên trước khi PR được deploy thì /sitemap.xml vẫn là
  // bản CŨ (một <urlset>). Chấp nhận cả hai kiểu: cũ -> chỉ kiểm có URL; mới -> kiểm cả file con.
  const sm = await request.get("/sitemap.xml");
  expect(sm.status()).toBe(200);
  const xml = await sm.text();
  const loc = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

  if (xml.includes("<sitemapindex")) {
    expect(loc.length).toBeGreaterThanOrEqual(2);          // index chỉ liệt kê các file con
    expect(loc.some((u) => u.includes("sitemap-khu-vuc"))).toBe(true);
    expect(loc.some((u) => u.includes("sitemap-tin/"))).toBe(true);
    for (const u of [loc.find((x) => x.includes("sitemap-khu-vuc"))!, loc.find((x) => x.includes("sitemap-tin/"))!]) {
      const r = await request.get(new URL(u).pathname);
      expect(r.status(), u).toBe(200);
      const t = await r.text();
      expect(t, u).toContain("<urlset");
      expect((t.match(/<loc>/g) || []).length, u).toBeGreaterThan(50);
    }
  } else {
    expect(xml).toContain("<urlset");
    expect(loc.length).toBeGreaterThan(10);
  }

  const rb = await request.get("/robots.txt");
  expect(rb.status()).toBe(200);
  expect(await rb.text()).toContain("/sitemap.xml");
});

test("trang 404: id tin không tồn tại không được sập server", async ({ page }) => {
  const resp = await page.goto("/listings/00000000-0000-0000-0000-000000000000");
  expect([200, 404]).toContain(resp?.status() ?? 0); // notFound() của Next trả 404 có UI, không phải 500
});
