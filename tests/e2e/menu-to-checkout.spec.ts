import { expect, test, type Page } from "@playwright/test";

/**
 * Alur utama: cari menu → pilih varian → keranjang + voucher → checkout → halaman QRIS statis
 * (nominal + kirim bukti via WhatsApp) → admin mengonfirmasi (disimulasikan di mode demo) →
 * otomatis ke halaman lacak pesanan.
 */

async function addArenKame(page: Page) {
  await page.goto("/menu");
  await page.getByLabel("Cari menu").fill("aren");
  // debounce 300 ms → URL ikut berubah (?q=aren)
  await expect(page).toHaveURL(/q=aren/);
  const card = page.getByRole("article").filter({ has: page.getByRole("link", { name: "Aren Kame Reguler", exact: true }) });
  await expect(card).toBeVisible();

  await card.getByRole("button", { name: /Tambah Aren Kame Reguler ke keranjang/ }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: /^Tambah ·/ }).click();
  await expect(sheet).toBeHidden();
}

test.describe("menu → checkout", () => {
  test("pesan dengan QRIS sampai pesanan terlacak", async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (e) => pageErrors.push(e.message));

    await addArenKame(page);

    // Keranjang: naikkan qty agar memenuhi minimal belanja voucher (Rp40.000 → 3 × Rp18.000)
    await page.goto("/keranjang");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await page.getByRole("button", { name: "Tambah Aren Kame Reguler", exact: true }).click();
    await expect(page.getByRole("group", { name: "Jumlah Aren Kame Reguler" })).toContainText("2");
    await page.getByRole("button", { name: "Tambah Aren Kame Reguler", exact: true }).click();
    await expect(page.getByRole("group", { name: "Jumlah Aren Kame Reguler" })).toContainText("3");

    await page.getByLabel("Kode voucher").fill("KAMEEHEMAT");
    await page.getByRole("button", { name: "Pakai" }).click();
    await expect(page.getByText(/Hemat Rp/).first()).toBeVisible();

    await page.getByRole("link", { name: /Lanjut ke Checkout/ }).click();
    await expect(page).toHaveURL(/\/checkout$/);

    // Checkout: data pemesan (default: ambil di outlet, sekarang, QRIS)
    await page.getByLabel("Nama").fill("Dinda Putri");
    await page.getByLabel("Nomor WhatsApp").fill("081234567890");
    await page.getByLabel("Nomor WhatsApp").blur(); // tutup keyboard: bar bayar sticky tampil lagi
    await page.getByTestId("submit-order").filter({ visible: true }).click();

    // Halaman pembayaran: QRIS statis toko + nominal persis + bukti via WhatsApp
    await expect(page).toHaveURL(/\/pesanan\/[A-Z0-9]+\/bayar/, { timeout: 20_000 });
    await expect(page.getByTestId("static-qris")).toBeVisible();
    await expect(page.getByTestId("static-qris")).toHaveAttribute("src", /qris-kameecoffee/);
    await expect(page.getByText("ID1026594722880").first()).toBeVisible();
    await expect(page.getByTestId("qris-amount")).toHaveText(/Rp\s?4\d\.\d{3}/); // 54.000 − diskon 20%
    await expect(page.getByRole("link", { name: /Kirim bukti bayar via WhatsApp/ })).toHaveAttribute("href", /^https:\/\/wa\.me\/6281280871630\?text=.*KM/);
    await expect(page.getByText(/\d{1,2}:\d{2}/).first()).toBeVisible();
    await expect(page.getByText(/Menunggu konfirmasi admin/)).toBeVisible();

    // Pesanan tetap menunggu sampai admin mengonfirmasi (tidak ada auto-lunas)
    await page.waitForTimeout(4000);
    await expect(page).toHaveURL(/\/bayar/);

    // Mode demo: simulasikan admin menekan "Konfirmasi pembayaran" → polling → pelacakan
    await page.getByTestId("mock-confirm").click();
    await expect(page.getByRole("heading", { name: "Pembayaran diterima!" })).toBeVisible({ timeout: 15_000 });
    await expect(page).toHaveURL(/\/pesanan\/[A-Z0-9]+\?phone=/, { timeout: 30_000 });
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/^KM/);

    expect(pageErrors).toEqual([]);
  });

  test("validasi checkout menolak nomor WhatsApp tidak valid", async ({ page }) => {
    await addArenKame(page);
    await page.goto("/checkout");
    await page.getByLabel("Nama").fill("Dinda");
    await page.getByLabel("Nomor WhatsApp").fill("12345");
    await page.getByLabel("Nomor WhatsApp").blur();
    await page.getByTestId("submit-order").filter({ visible: true }).click();
    await expect(page.getByLabel("Nomor WhatsApp")).toHaveAttribute("aria-invalid", "true");
    await expect(page).toHaveURL(/\/checkout$/);
  });

  test("Pesan via WhatsApp: POST /orders/whatsapp lalu membuka wa.me", async ({ page, context }) => {
    await addArenKame(page);
    await page.goto("/keranjang");
    await page.getByRole("button", { name: /Pesan via WhatsApp/ }).first().click();

    const dialog = page.getByRole("dialog", { name: "Pesan via WhatsApp" });
    await dialog.getByLabel("Nama").fill("Dinda Putri");
    await dialog.getByLabel("Nomor WhatsApp").fill("081234567890");

    const orderRequest = page.waitForRequest((r) => r.method() === "POST" && r.url().endsWith("/api/v1/orders/whatsapp"));
    // Tab baru dibuka sinkron saat klik (lolos popup blocker), lalu diarahkan ke wa.me setelah API merespons.
    const popupPromise = context.waitForEvent("page");
    await dialog.getByRole("button", { name: "Kirim ke WhatsApp" }).click();

    const req = await orderRequest;
    expect(req.postDataJSON()).toMatchObject({ customer: { name: "Dinda Putri" }, items: [{ qty: 1 }] });
    const popup = await popupPromise;
    await popup.route("https://wa.me/**", (route) => route.fulfill({ body: "wa.me" }));
    await expect.poll(() => popup.url(), { timeout: 15_000 }).toMatch(/^https:\/\/wa\.me\/\d+\?text=/);
  });

  test("keranjang kosong menampilkan ajakan ke menu", async ({ page }) => {
    await page.goto("/keranjang");
    await expect(page.getByRole("link", { name: /menu/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Lanjut ke Checkout/ })).toHaveCount(0);
  });
});
