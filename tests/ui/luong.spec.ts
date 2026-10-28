import { test, expect } from "@playwright/test";
import { ghiLoiJs, mo, layTinMau, laHep, TRANG_TIM } from "./_chung";

// LỚP 2 - đi hết các luồng chính như khách thật, ở mọi khổ (project ui-*).

test("trang chủ → gõ khu vực → kết quả → chi tiết tin", async ({ page }) => {
  const js = ghiLoiJs(page);
  await mo(page, "/");
  await page.locator('input[name="q"]:visible').first().fill("Gò Vấp");
  await page.keyboard.press("Enter");
  await page.waitForURL(/\/search\?.*q=/, { timeout: 30_000 });
  const tin = page.locator('a[href^="/listings/"]:visible').first();
  await expect(tin, "tìm 'Gò Vấp' phải có kết quả").toBeVisible({ timeout: 20_000 });
  await tin.click();
  await page.waitForURL(/\/listings\//, { timeout: 30_000 });
  await expect(page.locator("h1").first()).toBeVisible();
  expect(js).toEqual([]);
});

test("trang chủ → Xem bản đồ → bấm pin → popup ảnh + giá → chi tiết", async ({ page }) => {
  test.skip(laHep(page), "nút Xem bản đồ + bản đồ kết quả chỉ có từ lg (1024px)");
  const js = ghiLoiJs(page);
  await mo(page, "/");
  await page.locator('button[name="ban_do"]').click();
  await page.waitForURL(/ban_do=1/, { timeout: 30_000 });
  await expect(page.locator(".maplibregl-canvas").first()).toBeVisible({ timeout: 20_000 });
  await expect(page.locator(".maplibregl-marker").first()).toBeVisible({ timeout: 20_000 });
  // còn toàn cụm "N phòng" thì bấm cụm để tách, tối đa 5 lần
  for (let i = 0; i < 5 && !(await page.locator(".ndr-pin:visible").count()); i++) {
    await page.locator(".ndr-cum:visible").first().click();
    await page.waitForTimeout(900);
  }
  const pin = page.locator(".ndr-pin:visible").first();
  await expect(pin, "phải tách được tới pin giá").toBeVisible();
  await pin.click();
  const popup = page.locator(".ndr-popup .ndr-popup-tin").first();
  await expect(popup, "bấm pin phải mở popup tin").toBeVisible();
  await expect(popup).toContainText("Xem chi tiết");
  await expect(popup.locator("em"), "popup phải có giá").toBeVisible();
  await popup.click();
  await page.waitForURL(/\/listings\//, { timeout: 30_000 });
  expect(js).toEqual([]);
});

test("lọc tiện ích → bỏ lọc bằng chip 'Bộ lọc đang áp'", async ({ page }) => {
  const js = ghiLoiJs(page);
  await mo(page, `${TRANG_TIM}&ti=gac_lung`);
  const chip = page.locator('button[aria-label="Bỏ lọc Gác lửng"]:visible').first();
  await expect(chip, "tiện ích đang lọc phải có chip để bỏ (điện thoại không còn hàng tick)").toBeVisible();
  await chip.click();
  await page.waitForURL((u) => !u.search.includes("ti="), { timeout: 30_000 });
  await expect(page.locator('a[href^="/listings/"]:visible').first()).toBeVisible({ timeout: 20_000 });
  expect(js).toEqual([]);
});

test("tin rổ hàng → bấm Zalo: chép sẵn tin nhắn kèm mã phòng", async ({ page, context, baseURL }) => {
  const { roHang } = await layTinMau(page);
  test.skip(!roHang, "không tìm thấy tin rổ hàng");
  await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: new URL(baseURL!).origin });
  // không mở Zalo thật
  await context.route(/zalo\.me/, (r) => r.abort());
  context.on("page", (p) => { if (p !== page) void p.close(); });
  const js = ghiLoiJs(page);
  await mo(page, roHang!);
  const ma = (await page.getByText(/RH[0-9A-F]{6}/).first().textContent())!.match(/RH[0-9A-F]{6}/)![0];
  // đưa nút ra giữa màn: sát mép dưới thì bị nút nổi "Liên hệ & Hỏi AI" che (khách thật cuộn tiếp là bấm được)
  const zalo = page.locator('a:has-text("Zalo"):visible').first();
  await zalo.evaluate((e) => e.scrollIntoView({ block: "center" }));
  await zalo.click();
  await expect(page.getByRole("status").filter({ hasText: "Đã chép" }), "phải báo đã chép nội dung").toBeVisible();
  const daChep = await page.evaluate(() => navigator.clipboard.readText());
  expect(daChep, "nội dung chép phải có mã phòng (zalo.me bỏ qua ?text=)").toContain(ma);
  expect(js).toEqual([]);
});

test("tin web → có đường liên hệ (bài gốc / xem SĐT / gọi)", async ({ page }) => {
  const { web } = await layTinMau(page);
  test.skip(!web, "không tìm thấy tin web");
  const js = ghiLoiJs(page);
  await mo(page, web!);
  await expect(
    page.locator('a:has-text("Xem bài gốc"):visible, button:has-text("Bấm để hiện số"):visible, a:has-text("Đăng nhập"):visible, a[href^="tel:"]:visible, form:visible').first(),
    "tin web phải có ít nhất một cách liên hệ",
  ).toBeVisible();
  expect(js).toEqual([]);
});
