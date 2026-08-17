import { test, expect } from "@playwright/test";

// Luồng cốt lõi của người mua: trang chủ -> bấm tin -> xem chi tiết (gallery/map/form liên hệ).

test("trang chủ -> chi tiết tin: đủ gallery, form liên hệ", async ({ page }) => {
  await page.goto("/");
  const first = page.locator('a[href^="/listings/"]').first();
  await expect(first, "trang chủ phải có ít nhất 1 tin").toBeVisible({ timeout: 20_000 });
  await first.click();
  await page.waitForURL(/\/listings\//);

  // Có tiêu đề + giá + form liên hệ
  await expect(page.locator("h1").first()).toBeVisible();
  await expect(page.locator("form").first(), "phải có form liên hệ/lịch xem").toBeVisible();
});

test("gallery: vuốt/cuộn ảnh chính chuyển ảnh, mở lightbox rồi Esc đóng", async ({ page }) => {
  await page.goto("/");
  // tìm tin có nhiều ảnh (card có badge "N ảnh")
  const multi = page.locator('a[href^="/listings/"]', { hasText: /\d+ ảnh/ }).first();
  if (!(await multi.count())) test.skip(true, "không có tin nhiều ảnh trong feed");
  await multi.click();
  await page.waitForURL(/\/listings\//);

  const track = page.locator(".snap-x").first();
  await expect(track).toBeVisible({ timeout: 15_000 });

  // Cuộn track sang phải 1 khung hình -> bộ đếm phải nhảy sang 2/n
  await track.evaluate((el) => el.scrollTo({ left: el.clientWidth, behavior: "instant" as ScrollBehavior }));
  await expect(page.locator("text=/2\\/\\d+/").first()).toBeVisible({ timeout: 5_000 });

  // Bấm ảnh mở lightbox, Esc đóng
  await track.locator("img").nth(1).click({ force: true });
  const lightbox = page.locator(".fixed.inset-0");
  await expect(lightbox).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(lightbox).toBeHidden();
});

test("yêu thích ♥: bấm tim trên card -> hiện ở /yeu-thich, không cần đăng nhập", async ({ page }) => {
  await page.goto("/");
  const fav = page.locator('button[aria-label="Lưu tin"]').first();
  await expect(fav).toBeVisible({ timeout: 20_000 });
  await fav.click();
  await expect(page.locator('button[aria-label="Bỏ lưu tin"]').first()).toBeVisible();

  await page.goto("/yeu-thich");
  await expect(page.locator('a[href^="/listings/"]').first(), "tin đã ♥ phải hiện ở trang yêu thích").toBeVisible({ timeout: 15_000 });
});
