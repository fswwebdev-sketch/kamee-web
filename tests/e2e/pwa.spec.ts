import { expect, test } from "@playwright/test";

/**
 * Service worker & mode offline. SW hanya aktif di build produksi TANPA mock MSW
 * (keduanya butuh scope "/"), jadi tes ini dijalankan terhadap build yang terhubung ke kamee-api:
 *   E2E_PWA=1 E2E_BASE_URL=http://localhost:3000 npx playwright test pwa --project=pixel-7
 */
test.skip(!process.env.E2E_PWA, "Set E2E_PWA=1 dan jalankan terhadap build tanpa mock (lihat README)");

test("service worker men-cache menu dan menampilkan halaman offline", async ({ page, context }) => {
  await page.goto("/");
  await page.waitForFunction(async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    return Boolean(reg?.active);
  }, null, { timeout: 30_000 });
  // Halaman pertama belum dikendalikan SW → muat ulang lalu kunjungi menu agar ikut ter-cache
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);
  await page.goto("/menu");
  await expect(page.getByRole("heading", { level: 1, name: /Menu Kamee/ })).toBeVisible();
  await page.waitForLoadState("networkidle");

  await context.setOffline(true);
  // Halaman yang pernah dibuka tetap tampil dari cache
  await page.reload();
  await expect(page.getByRole("heading", { level: 1, name: /Menu Kamee/ })).toBeVisible();
  await expect(page.getByRole("article").first()).toBeVisible();
  // Halaman yang belum pernah dibuka → halaman offline
  await page.goto("/tentang");
  await expect(page.getByRole("heading", { name: "Kamu sedang offline" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Coba lagi" })).toBeVisible();
  // Saat koneksi kembali, halaman offline memuat ulang sendiri (event "online")
  await context.setOffline(false);
  await expect(page.getByRole("heading", { name: "Kamu sedang offline" })).toBeHidden({ timeout: 15_000 });
  await expect(page).toHaveURL(/\/tentang$/);
});
