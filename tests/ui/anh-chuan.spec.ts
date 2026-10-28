import { test, expect } from "@playwright/test";
import { mo, laHep } from "./_chung";

// LỚP 3 - so ảnh với bản chuẩn đã duyệt: chỉ những phần KHÔNG đổi theo dữ liệu (logo, menu, ô tìm kiếm,
// popup bộ lọc, chân trang). Số tin / chip quận theo số đếm đổi mỗi ngày nên bị che.
// Chỉ chạy trên máy (Windows): CI Linux vẽ font khác -> lệch giả. Đổi giao diện có chủ ý thì cập nhật bản chuẩn:
//   npm run test:ui:local -- tests/ui/anh-chuan.spec.ts --update-snapshots
test.skip(!!process.env.CI, "so ảnh chỉ chạy trên máy - CI vẽ font khác");

const SO = { maxDiffPixelRatio: 0.01, animations: "disabled" as const };

for (const scheme of ["light", "dark"] as const) {
  test.describe(scheme === "light" ? "sáng" : "tối", () => {
    test.use({ colorScheme: scheme });

    test("menu đầu trang + logo", async ({ page }) => {
      await mo(page, "/");
      await expect(page.locator("header").first()).toHaveScreenshot(`menu-${scheme}.png`, SO);
    });
  });
}

test("logo SVG cỡ lớn", async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 520 });
  for (const f of ["logo", "logo-dark", "icon"]) {
    await page.goto(`/${f}.svg`);
    await expect(page).toHaveScreenshot(`${f}-svg.png`, SO);
  }
});

test("ô tìm kiếm trang chủ", async ({ page }) => {
  await mo(page, "/");
  const o = page.locator('.card:has(input[name="q"])').first();
  await expect(o).toHaveScreenshot("o-tim-kiem.png", { ...SO, mask: [o.locator(".cuon-ngang")] });
});

test("popup Bộ lọc", async ({ page }) => {
  await mo(page, "/search?deal=cho_thue");
  await page.locator('button:has-text("Bộ lọc"):visible').first().click();
  const popup = page.locator("form:has(h2:has-text('Bộ lọc tìm kiếm'))");
  await expect(popup).toBeVisible();
  await expect(popup).toHaveScreenshot("popup-bo-loc.png", SO);
});

test("chân trang", async ({ page }) => {
  test.skip(laHep(page) && (page.viewportSize()?.width ?? 0) > 640, "tablet: đủ ở điện thoại + máy tính");
  await mo(page, "/gioi-thieu");
  const footer = page.locator("footer").first();
  await footer.scrollIntoViewIfNeeded();
  await expect(footer).toHaveScreenshot("chan-trang.png", { ...SO, mask: [footer.locator("time, [data-dong]")] });
});
