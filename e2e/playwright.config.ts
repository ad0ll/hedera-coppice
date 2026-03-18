import { defineConfig } from "@playwright/test";

const PORT = parseInt(process.env.E2E_PORT || "3100", 10);
const BASE_URL = process.env.E2E_BASE_URL || `http://localhost:${PORT}`;
const isRemote = !!process.env.E2E_BASE_URL;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 4,
  reporter: "html",
  timeout: 60000,
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  // Only start local dev server when not targeting a remote URL
  ...(isRemote
    ? {}
    : {
        webServer: {
          command: `cd ../frontend && npx next dev --port ${PORT} --webpack`,
          port: PORT,
          reuseExistingServer: !process.env.CI,
          timeout: 30000,
        },
      }),
  projects: [
    {
      name: "chromium",
      testIgnore: /mobile\.spec\.ts/,
      use: { browserName: "chromium" },
    },
    {
      name: "mobile",
      testMatch: /mobile\.spec\.ts/,
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
