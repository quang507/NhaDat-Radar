import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

// 17/11/2026: nút "Tiếp tục với Google" phải bấm 2 lần. sw.js bật navigationPreload nhưng lại bỏ qua (return)
// điều hướng /auth và /api -> Chrome gửi 2 request cho cùng một URL (1 preload + 1 thường). /auth/callback?code=…
// chỉ đổi được 1 lần nên request thứ hai báo "flow state not found". Đã bật preload thì MỌI điều hướng cùng
// origin phải được trả bằng preloadResponse. Chạy không cần mạng.

type SuKien = { request: { mode: string; method: string; url: string }; preloadResponse: Promise<unknown>; respondWith: (p: Promise<unknown>) => void };

function napSW() {
  const nghe: Record<string, (e: SuKien) => void> = {};
  const self = {
    addEventListener: (ten: string, fn: (e: SuKien) => void) => { nghe[ten] = fn; },
    skipWaiting() {},
    registration: {},
    clients: {},
  };
  const ma = fs.readFileSync(path.join(__dirname, "../../public/sw.js"), "utf8");
  let soLanFetch = 0;
  vm.runInNewContext(ma, {
    self, URL, Request: class {}, Response: { error: () => "loi" },
    caches: { match: async () => "offline" },
    location: { origin: "https://www.nhadatradar.com" },
    fetch: async () => { soLanFetch++; return "mang"; },
  });
  return { ma, fetchSuKien: nghe.fetch, soLanFetch: () => soLanFetch };
}

async function dieuHuong(duongDan: string) {
  const sw = napSW();
  let tra: Promise<unknown> | null = null;
  sw.fetchSuKien({
    request: { mode: "navigate", method: "GET", url: `https://www.nhadatradar.com${duongDan}` },
    preloadResponse: Promise.resolve("preload"),
    respondWith: (p) => { tra = p; },
  });
  return { tra: tra as Promise<unknown> | null, sw };
}

test("sw.js vẫn bật navigationPreload (bài kiểm tra dưới chỉ có nghĩa khi bật)", () => {
  expect(napSW().ma).toContain("navigationPreload.enable()");
});

for (const duongDan of ["/auth/callback?code=abc", "/auth", "/api/revalidate", "/listings/123"]) {
  test(`điều hướng ${duongDan} dùng preloadResponse, không gửi request thứ hai`, async () => {
    const { tra, sw } = await dieuHuong(duongDan);
    // không respondWith = Chrome bỏ lượt preload đã gửi rồi tự gửi thêm 1 request nữa
    expect(tra, "SW phải respondWith cho mọi điều hướng cùng origin").not.toBeNull();
    expect(await tra).toBe("preload");
    expect(sw.soLanFetch()).toBe(0);
  });
}
