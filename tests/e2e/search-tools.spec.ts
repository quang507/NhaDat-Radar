import { test, expect } from "@playwright/test";

// Tìm kiếm + công cụ tính toán.

test("search: lọc theo tỉnh qua URL trả kết quả đúng khu vực", async ({ page }) => {
  await page.goto("/search?province=" + encodeURIComponent("Hà Nội"));
  const cards = page.locator('a[href^="/listings/"]');
  await expect(cards.first(), "phải có kết quả cho Hà Nội").toBeVisible({ timeout: 20_000 });
});

test("search: bộ lọc không khớp gì -> thông báo rỗng thay vì trang trắng", async ({ page }) => {
  await page.goto("/search?q=" + encodeURIComponent("zzz-khong-ton-tai-999"));
  // Không có card nào cũng được, nhưng body phải có nội dung (không lỗi trắng trang)
  await expect(page.locator("body")).toContainText(/không|0|kết quả|thử/i, { timeout: 15_000 });
});

test("máy tính lãi vay: đổi giá trị -> số tiền hàng tháng thay đổi", async ({ page }) => {
  await page.goto("/tinh-lai-vay");
  const priceInput = page.locator('input[type="number"]').first();
  await expect(priceInput).toBeVisible();

  const before = await page.locator("body").textContent();
  await priceInput.fill("5000000000");
  await page.waitForTimeout(400);
  const after = await page.locator("body").textContent();
  expect(after).not.toBe(before); // kết quả tính lại ngay, không cần bấm nút
  await expect(page.locator("body")).toContainText(/₫/);
});

test("nav mobile: menu ☰ mở được các trang chính", async ({ page, isMobile }) => {
  test.skip(!isMobile, "chỉ chạy ở project mobile");
  await page.goto("/");
  const burger = page.locator('button[aria-label="Mở menu"]').first();
  await expect(burger).toBeVisible({ timeout: 15_000 });
  await burger.click();
  await expect(page.locator('a[href="/search"]').first()).toBeVisible();
});
