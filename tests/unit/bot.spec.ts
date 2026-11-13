import { test, expect } from "@playwright/test";
import { phanLoaiKhach, duongDanCamBot, phaiChan } from "../../src/lib/bot";

// Hướng B (14/11/2026): bot cào chỉ được vào trang đích. Chạy không cần mạng.

const CHROME_DT = "Mozilla/5.0 (Linux; Android 13; SM-A536E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const CUBOT = "Mozilla/5.0 (Linux; Android 11; CUBOT NOTE 20) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const ZALO_APP = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Zalo iOS/24.06.01";
const FB_APP = "Mozilla/5.0 (Linux; Android 13; SM-A536E) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/470.0.0.0;]";
const META = "meta-webindexer/1.1 (+https://developers.facebook.com/docs/sharing/webmasters/crawler)";
const GOOGLE = "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";
const OAI = "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot)";
const BYTE = "Mozilla/5.0 (Linux; Android 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; Bytespider; spider-feedback@bytedance.com)";
const HEADLESS = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/126.0.0.0 Safari/537.36";
const FB_XEM_TRUOC = "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";

test("người thật, kể cả máy CUBOT và trình duyệt trong ứng dụng", () => {
  for (const ua of [CHROME_DT, CUBOT, FB_APP]) expect(phanLoaiKhach(ua), ua).toBe("nguoi");
  expect(phanLoaiKhach(ZALO_APP)).not.toBe("bot_cao");
});

test("bot cào: có khai +http, không bắt đầu bằng Mozilla/, headless, tên bot đã biết, UA trống", () => {
  for (const ua of [META, GOOGLE, OAI, BYTE, HEADLESS, "curl/8.5.0", "python-requests/2.32.3", "node", "", null, undefined])
    expect(phanLoaiKhach(ua), String(ua)).toBe("bot_cao");
});

test("bot xem trước link và bộ tải của ứng dụng di động", () => {
  for (const ua of [FB_XEM_TRUOC, "TelegramBot (like TwitterBot)", "WhatsApp/2.23.20.0", "okhttp/4.12.0",
    "Dalvik/2.1.0 (Linux; U; Android 13; SM-A536E Build/TP1A)", "Zalo/2406 CFNetwork/1496.0.7 Darwin/23.5.0"])
    expect(phanLoaiKhach(ua), ua).toBe("xem_truoc");
});

test("đường dẫn cấm bot: trang tin, tìm kiếm, thống kê, tài khoản; KHÔNG gồm trang đích và /api", () => {
  for (const p of ["/listings/3e6720d8-e7d8-4233-9165-3c4256fce81c", "/search", "/thong-ke", "/auth", "/auth/doi-mat-khau",
    "/yeu-thich", "/agents", "/rh/RHC2FCD3", "/dashboard/new", "/account", "/admin"]) expect(duongDanCamBot(p), p).toBe(true);
  for (const p of ["/", "/nha-dat-cho-thue/ho-chi-minh/quan-go-vap", "/phong-tro-gan/etown-cong-hoa", "/tin-tuc/abc",
    "/projects/abc", "/api/revalidate", "/api/su-kien", "/searching", "/authors"]) expect(duongDanCamBot(p), p).toBe(false);
});

test("phaiChan: chỉ bot cào trên đường dẫn cấm", () => {
  const TIN = "/listings/3e6720d8-e7d8-4233-9165-3c4256fce81c";
  expect(phaiChan(META, TIN)).toBe(true);
  expect(phaiChan(GOOGLE, "/search")).toBe(true);
  expect(phaiChan(null, TIN)).toBe(true);
  expect(phaiChan(null, "/")).toBe(false);
  expect(phaiChan(META, "/nha-dat-cho-thue/ho-chi-minh")).toBe(false);
  expect(phaiChan(FB_XEM_TRUOC, TIN)).toBe(false);
  expect(phaiChan(CHROME_DT, TIN)).toBe(false);
  expect(phaiChan("node", "/api/revalidate")).toBe(false);
});
