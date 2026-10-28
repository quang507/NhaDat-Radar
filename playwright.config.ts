import { defineConfig, devices } from "@playwright/test";

// BASE_URL: mặc định chạy trên bản production; CI/PR có thể trỏ sang preview Vercel.
// (22/9: domain cũ nha-dat-radar-rkyn.vercel.app đã trả 404 -> mặc định về domain thật)
// `npm run test:ui:local` (28/10): chạy bộ giao diện trên bản build ở máy (next start :3001) TRƯỚC khi push.
// Chạy riêng 1 file trên máy: BASE_URL=http://localhost:3001 npx playwright test tests/ui/luong.spec.ts
const LOCAL = process.env.npm_lifecycle_event === "test:ui:local" || /localhost/.test(process.env.BASE_URL || "");
const BASE_URL = process.env.BASE_URL || (LOCAL ? "http://localhost:3001" : "https://nhadatradar.com");

// Bộ giao diện tests/ui: 4 khổ - điện thoại 375, tablet 768, ngưỡng lg 1024 (bản đồ + bộ lọc đủ hiện), máy tính 1440.
// Đều chạy Chromium (cần quyền clipboard cho luồng nút Zalo).
const KHO_UI = [
  { name: "ui-dt", use: { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: devices["Pixel 7"].userAgent } },
  { name: "ui-tablet", use: { viewport: { width: 768, height: 1024 }, hasTouch: true } },
  { name: "ui-lg", use: { viewport: { width: 1024, height: 768 } } },
  { name: "ui-pc", use: { viewport: { width: 1440, height: 900 } } },
];

export default defineConfig({
  testDir: "tests",
  timeout: 45_000,
  retries: process.env.CI ? 2 : 0,          // web live cold-start ~4s, cho phép retry trên CI
  reporter: [["list"], ["html", { outputFolder: "tests/report-html", open: "never" }]],
  use: {
    baseURL: BASE_URL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "unit", testMatch: /tests\/unit\/.*\.spec\.ts/ },
    {
      name: "desktop",
      testMatch: /tests\/e2e\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      testMatch: /tests\/e2e\/.*\.spec\.ts/,
      use: { ...devices["iPhone 14"] },     // kiểm tra vuốt gallery + menu ☰ đúng trải nghiệm điện thoại
    },
    ...KHO_UI.map((k) => ({ ...k, testMatch: /tests\/ui\/.*\.spec\.ts/, use: { browserName: "chromium" as const, ...k.use } })),
  ],
  ...(LOCAL ? { webServer: { command: "npx next start -p 3001", url: BASE_URL, reuseExistingServer: true, timeout: 120_000 } } : {}),
});
