import { test, expect } from "@playwright/test";
import { ghiLoiJs, mo, soiBoCuc, trongManDau, layTinMau, laHep, laDienThoai, dinhAnh, chuThanhDay, TRANG_TIM } from "./_chung";

// LỚP 1 - soi bố cục: mỗi trang chính × mọi khổ (project ui-*) × sáng/tối.
// Lỗi in kèm phần tử gây lỗi, ví dụ: `đè nhau trong thẻ: span "ĐÃ XÁC MINH" × button (9×20px)`.

for (const scheme of ["light", "dark"] as const) {
  test.describe(`nền ${scheme === "light" ? "sáng" : "tối"}`, () => {
    test.use({ colorScheme: scheme });

    test("trang chủ", async ({ page }, info) => {
      const js = ghiLoiJs(page);
      await mo(page, "/");
      const loi = await soiBoCuc(page);
      // khách vào trang chủ để tìm: ô tìm kiếm phải lộ ra ở màn đầu (đủ chỗ bấm 44px)
      const o = await trongManDau(page, 'input[name="q"]');
      if (o == null || o > page.viewportSize()!.height - 44) loi.push(`ô tìm kiếm nằm ngoài màn đầu (top ${o}px)`);
      if (loi.length) await dinhAnh(page, info, "trang-chu");
      expect([...loi, ...js]).toEqual([]);
    });

    test("tìm kiếm - danh sách", async ({ page }, info) => {
      const js = ghiLoiJs(page);
      await mo(page, TRANG_TIM);
      const loi = await soiBoCuc(page);
      // điện thoại + tablet: tin đầu tiên phải bắt đầu trong màn đầu (bộ lọc không được chiếm hết)
      if (laHep(page)) {
        const t = await trongManDau(page, 'a[href^="/listings/"]');
        if (t == null || t > page.viewportSize()!.height - 80) loi.push(`tin đầu tiên nằm ngoài màn đầu (top ${t}px)`);
      }
      if (loi.length) await dinhAnh(page, info, "tim-kiem");
      expect([...loi, ...js]).toEqual([]);
    });

    test("tìm kiếm - bản đồ", async ({ page }, info) => {
      test.skip(laHep(page), "bản đồ kết quả chỉ có từ lg (1024px)");
      const js = ghiLoiJs(page);
      await mo(page, `${TRANG_TIM}&ban_do=1`);
      await expect(page.locator(".maplibregl-canvas").first(), "bật ban_do=1 phải thấy bản đồ").toBeVisible({ timeout: 20_000 });
      await expect(page.locator(".maplibregl-marker").first(), "bản đồ phải có pin / cụm").toBeVisible({ timeout: 20_000 });
      const loi = await soiBoCuc(page);
      if (loi.length) await dinhAnh(page, info, "ban-do");
      expect([...loi, ...js]).toEqual([]);
    });

    test("chi tiết tin rổ hàng", async ({ page }, info) => {
      const { roHang } = await layTinMau(page);
      test.skip(!roHang, "không tìm thấy tin rổ hàng trên trang tìm kiếm");
      const js = ghiLoiJs(page);
      await mo(page, roHang!);
      const loi = await soiBoCuc(page);
      const vh = page.viewportSize()!.height;
      const h1 = await trongManDau(page, "h1");
      if (h1 == null || h1 > vh * 0.5) loi.push(`tiêu đề không nằm nửa trên màn đầu (top ${h1}px)`);
      const anh = await trongManDau(page, "main img, .snap-x img");
      if (anh == null || anh > vh - 60) loi.push(`ảnh tin bị đẩy khỏi màn đầu (top ${anh}px)`);
      // nghiệp vụ (CLAUDE.md mục 4): mã phòng to rõ, liên hệ qua Zalo / hotline Radar
      await expect(page.getByText(/Mã:\s*RH[0-9A-F]{6}/).first(), "phải hiện Mã phòng").toBeVisible();
      if (laDienThoai(page)) {
        // thanh cố định đáy màn hình (vùng ngón cái - CLAUDE.md mục 3) phải có cả Gọi lẫn Zalo
        const day = await chuThanhDay(page);
        if (!/Gọi/.test(day) || !/Zalo/.test(day)) loi.push(`thanh đáy điện thoại thiếu Gọi/Zalo: "${day}"`);
      }
      if (loi.length) await dinhAnh(page, info, "chi-tiet-ro-hang");
      expect([...loi, ...js]).toEqual([]);
    });

    test("chi tiết tin web", async ({ page }, info) => {
      const { web } = await layTinMau(page);
      test.skip(!web, "không tìm thấy tin web");
      const js = ghiLoiJs(page);
      await mo(page, web!);
      const loi = await soiBoCuc(page);
      const h1 = await trongManDau(page, "h1");
      if (h1 == null || h1 > page.viewportSize()!.height * 0.5) loi.push(`tiêu đề không nằm nửa trên màn đầu (top ${h1}px)`);
      if (loi.length) await dinhAnh(page, info, "chi-tiet-web");
      expect([...loi, ...js]).toEqual([]);
    });

    for (const [ten, duong] of [["định giá", "/dinh-gia"], ["đăng bán", "/ban"], ["khu vực cho thuê", "/nha-dat-cho-thue"]] as const) {
      test(ten, async ({ page }, info) => {
        const js = ghiLoiJs(page);
        await mo(page, duong);
        await expect(page.locator("h1").first()).toBeVisible();
        const loi = await soiBoCuc(page);
        if (loi.length) await dinhAnh(page, info, ten);
        expect([...loi, ...js]).toEqual([]);
      });
    }
  });
}
