import { defineConfig, devices } from "@playwright/test";

// BASE_URL: mặc định chạy trên bản production; CI/PR có thể trỏ sang preview Vercel.
const BASE_URL = process.env.BASE_URL || "https://nha-dat-radar-rkyn.vercel.app";

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
  ],
});
