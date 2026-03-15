import { defineConfig } from "@playwright/test";

const PORT = parseInt(process.env.E2E_PORT || "3100", 10);

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  timeout: 60000,
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `cd ../frontend && npx next dev --port ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
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
