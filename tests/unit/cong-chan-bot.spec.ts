import { test, expect } from "@playwright/test";
import { NextRequest } from "next/server";
import { middleware } from "../../src/middleware";
import { phanLoaiKhach } from "../../src/lib/bot";
import config from "../../playwright.config";

// Review hướng B (14/11/2026). Chạy không cần mạng.

const META = "meta-webindexer/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)";
const TIN = "https://www.nhadatradar.com/listings/3e6720d8-e7d8-4233-9165-3c4256fce81c";

test("trang 403 cho bot không được lưu ở cache dùng chung", async () => {
  const res = await middleware(new NextRequest(TIN, { headers: { "user-agent": META } }));
  expect(res.status).toBe(403);
  const cc = res.headers.get("cache-control") || "";
  // nội dung phụ thuộc User-Agent: cache dùng chung (CDN, proxy) không được giữ rồi trả cho người thật
  expect(cc).not.toMatch(/public|s-maxage/);
  expect(cc).toMatch(/private|no-store/);
});

test("mọi khổ test E2E/UI gửi User-Agent người thật, không bị cổng chặn bot trả 403", () => {
  const khoTrinhDuyet = (config.projects || []).filter((p) => p.name !== "unit");
  expect(khoTrinhDuyet.length).toBeGreaterThan(0);
  for (const p of khoTrinhDuyet) {
    // không đặt userAgent thì Playwright gửi "HeadlessChrome/..." -> bị coi là bot cào
    expect(phanLoaiKhach(p.use?.userAgent), `${p.name}: ${p.use?.userAgent}`).toBe("nguoi");
  }
});
