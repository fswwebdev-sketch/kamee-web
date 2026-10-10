import { expect, test, type Page } from "@playwright/test";

/**
 * Fitur Keuangan admin (Kasir, Resep & HPP, Bahan & Stok, Buku Kas, Ringkasan) terhadap mock MSW admin.
 * Data awal = buku catatan pemilik 20–29 Sep 2026 (lihat mocks/admin). Tes berurutan karena saling
 * memengaruhi stok/kas di server mock yang sama, dan hanya dijalankan di proyek desktop.
 */

async function login(page: Page, email: string) {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel("Email").fill(email);
  await page.locator("input[name=password]").fill("password");
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/admin$/);
}

const sidebar = (page: Page) => page.getByRole("complementary", { name: "Navigasi admin" });
const SEPT = "periode=custom&dari=2026-09-20&sampai=2026-09-29";

test.describe.serial("keuangan admin", () => {
  test.use({ viewport: { width: 1280, height: 900 } });
  // Data mock bersama (stok/kas berubah) — cukup sekali, di proyek desktop
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== "desktop", "Hanya proyek desktop");
  });

  test("Resep & HPP: Aren Kame Cup HPP Rp12.580 dan jumlah cup yang bisa dibuat", async ({ page }) => {
    await login(page, "admin.cibodas@kamee.id");
    for (const label of ["Kasir", "Ringkasan Keuangan", "Buku Kas", "Bahan & Stok", "Resep & HPP"]) {
      await expect(sidebar(page).getByRole("link", { name: label })).toBeVisible();
    }
    await sidebar(page).getByRole("link", { name: "Resep & HPP" }).click();
    await expect(page).toHaveURL(/\/admin\/resep$/);

    const card = page.getByRole("article", { name: "Aren Kame Reguler", exact: true });
    await expect(card).toBeVisible();
    const cup = card.getByRole("region", { name: "Cup", exact: true });
    await expect(cup).toContainText("Rp12.580");
    // Stok awal 110 cup (bisa berkurang bila tes lain di server mock yang sama sudah menjual)
    await expect(cup).toContainText(/Cukup untuk \d+ cup/);
    await expect(cup).toContainText("Cup 12 oz + tutup");
    // Resep asli pemilik → tanpa tanda contoh
    await expect(card.getByText("Contoh — ubah sesuai resep")).toHaveCount(0);
  });

  test("Kasir: Aren Kame (Cup) ×2 tunai Rp50.000 → kembalian Rp14.000, stok cup berkurang", async ({ page }) => {
    await login(page, "admin.cibodas@kamee.id");
    // Stok cup sebelum transaksi (server mock dipakai bersama tes lain)
    await page.goto("/admin/bahan?tab=kemasan");
    const before = parseInt((await page.getByRole("row", { name: /Cup 12 oz \+ tutup/ }).getByTestId("stock-qty").innerText()).replace(/\D/g, ""), 10);
    await page.goto("/admin/kasir");

    await page.getByRole("button", { name: /^Aren Kame Reguler/ }).click();
    const opt = page.getByRole("dialog", { name: "Aren Kame Reguler" });
    await opt.getByText("Cup", { exact: true }).click();
    await expect(opt.getByRole("radio", { name: /^Cup/ })).toBeChecked();
    await opt.getByRole("button", { name: "Tambah Aren Kame Reguler" }).click();
    await opt.getByRole("button", { name: /Tambah ke keranjang/ }).click();
    await expect(opt).toBeHidden();

    const cart = page.getByRole("complementary", { name: "Keranjang kasir" });
    await expect(cart.getByTestId("pos-total")).toHaveText("Rp36.000");
    await cart.getByRole("radio", { name: "Tunai" }).click();
    await cart.getByLabel("Uang diterima").fill("50000");
    await expect(cart.getByTestId("pos-change")).toHaveText("Rp14.000");
    await cart.getByRole("button", { name: /^Bayar/ }).click();

    const done = page.getByRole("dialog", { name: /Pesanan tersimpan/ });
    await expect(done).toBeVisible();
    await expect(done.getByTestId("pos-result-change")).toHaveText("Rp14.000");
    await expect(done.getByRole("button", { name: "Cetak struk" })).toBeVisible();
    await done.getByRole("button", { name: "Pesanan baru" }).click();
    await expect(done).toBeHidden();

    await page.goto("/admin/bahan?tab=kemasan");
    const row = page.getByRole("row", { name: /Cup 12 oz \+ tutup/ });
    await expect(row.getByTestId("stock-qty")).toHaveText(`${before - 2} pcs`);
  });

  test("Kasir: catat susulan dengan tanggal kemarin, struk bisa 58/80 mm", async ({ page }) => {
    await login(page, "admin.cibodas@kamee.id");
    await page.goto("/admin/kasir");

    await page.getByTestId("pos-backdate").click();
    const ymd = (d: Date) => new Date(d.getTime() + 7 * 3_600_000).toISOString().slice(0, 10);
    const yesterday = ymd(new Date(Date.now() - 86_400_000));
    await expect(page.getByTestId("pos-sale-date")).toHaveValue(yesterday);
    await page.getByTestId("pos-sale-time").fill("14:30");

    await page.getByRole("button", { name: /^Aren Kame Reguler/ }).click();
    const opt = page.getByRole("dialog", { name: "Aren Kame Reguler" });
    await opt.getByText("Cup", { exact: true }).click();
    await opt.getByRole("button", { name: /Tambah ke keranjang/ }).click();

    const cart = page.getByRole("complementary", { name: "Keranjang kasir" });
    await cart.getByRole("radio", { name: "QRIS" }).click();
    await cart.getByRole("button", { name: /^Simpan Rp18\.000/ }).click();

    const done = page.getByRole("dialog", { name: /Pesanan tersimpan/ });
    const [y, m, d] = yesterday.split("-").map(Number);
    const label = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
    await expect(done).toContainText(label);
    await expect(done).toContainText("14.30");

    // Jangan buka dialog cetak (dan menutup jendela) di tes
    await page.context().addInitScript(() => (window.print = () => {}));
    const [popup] = await Promise.all([page.waitForEvent("popup"), done.getByRole("button", { name: "Cetak struk" }).click()]);
    const receipt = popup.getByRole("article", { name: /Struk pesanan/ });
    await expect(receipt).toContainText("TOTAL");
    await popup.getByRole("radio", { name: "80 mm" }).click();
    await expect(popup.getByRole("radio", { name: "80 mm" })).toHaveAttribute("aria-checked", "true");
    expect(Math.round((await receipt.boundingBox())!.width)).toBe(302);
  });

  test("Ringkasan Keuangan 20–29 Sep 2026: pemasukan per metode & pengeluaran", async ({ page }) => {
    await login(page, "admin.cibodas@kamee.id");
    await page.goto(`/admin/keuangan?${SEPT}`);
    await expect(page.getByRole("heading", { name: "Ringkasan keuangan" })).toBeVisible();

    const income = page.getByTestId("income-by-method");
    await expect(income).toContainText("Transfer");
    await expect(income).toContainText("Tunai");
    await expect(page.getByTestId("stat-expense")).toContainText("Rp3.421.845");
    await expect(page.getByTestId("expense-by-category")).toContainText("Bahan baku");
    await expect(page.getByRole("heading", { name: "Menu terlaris" })).toBeVisible();
  });

  test("Buku Kas 20–29 Sep 2026: total masuk/keluar lalu tambah pengeluaran", async ({ page }) => {
    await login(page, "admin.cibodas@kamee.id");
    await page.goto("/admin/keuangan/kas");
    // Pilih rentang lewat filter periode (bukan URL) seperti pengguna sebenarnya
    await page.getByLabel("Periode").selectOption("custom");
    await page.getByLabel("Dari", { exact: true }).fill("2026-09-20");
    await expect(page).toHaveURL(/dari=2026-09-20/);
    await page.getByLabel("Sampai", { exact: true }).fill("2026-09-29");
    await expect(page).toHaveURL(/sampai=2026-09-29/);

    await expect(page.getByTestId("cash-income")).toContainText("Rp2.336.000");
    await expect(page.getByTestId("cash-expense")).toContainText("Rp3.421.845");

    await page.getByRole("button", { name: "Uang keluar" }).first().click();
    const dialog = page.getByRole("dialog", { name: /Catat uang masuk\/keluar/ });
    await dialog.getByLabel("Tanggal").fill("2026-09-25");
    await dialog.getByLabel("Kategori").selectOption("operasional");
    await dialog.getByLabel("Keterangan").fill("Gas elpiji e2e");
    await dialog.getByLabel("Nominal").fill("23000");
    await dialog.getByRole("button", { name: "Simpan catatan" }).click();
    await expect(dialog).toBeHidden();

    await expect(page.getByRole("row", { name: /Gas elpiji e2e/ })).toContainText("Rp23.000");
    await expect(page.getByTestId("cash-expense")).toContainText("Rp3.444.845");

    // Belanja stok 20/9 tercatat otomatis di buku kas (rentang satu hari agar tidak terpotong halaman)
    await page.goto("/admin/keuangan/kas?periode=custom&dari=2026-09-20&sampai=2026-09-20");
    await expect(page.getByText("Dari belanja stok").first()).toBeVisible();
  });
});
