import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/solo-e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["html", { open: "never" }], ["list"]] : "list",
  use: {
    baseURL: "http://127.0.0.1:4180",
    trace: "on-first-retry",
  },
  webServer: {
    command: "pnpm build && node ./scripts/start-solo-qualification.mjs",
    reuseExistingServer: false,
    timeout: 120_000,
    url: "http://127.0.0.1:4180/health/ready",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
