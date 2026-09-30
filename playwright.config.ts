import { defineConfig, devices } from "@playwright/test";

/**
 * E2E berjalan terhadap build produksi dengan mock MSW (NEXT_PUBLIC_API_MOCKING=enabled),
 * jadi tidak butuh backend. Set E2E_BASE_URL untuk menguji server yang sudah berjalan.
 * Build memakai font Google asli; di lingkungan tanpa internet pakai E2E_OFFLINE=1.
 */
const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;
const build = process.env.E2E_OFFLINE ? "npm run build:offline" : "npm run build";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "id-ID",
    timezoneId: "Asia/Jakarta",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `${build} && npx next start -p ${PORT}`,
        url: baseURL,
        timeout: 300_000,
        reuseExistingServer: !process.env.CI,
        env: { NEXT_PUBLIC_API_MOCKING: "enabled" },
      },
});
