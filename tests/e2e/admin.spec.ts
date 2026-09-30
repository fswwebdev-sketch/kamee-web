import { expect, test, type Page } from "@playwright/test";

/**
 * Panel admin terhadap mock MSW admin (mocks/admin), tanpa backend.
 * Akun mock: superadmin@kamee.id & admin.cikokol@kamee.id, sandi "password".
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

test.describe("panel admin", () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test("tanpa sesi diarahkan ke login dan sandi salah ditolak", async ({ page }) => {
    await page.goto("/admin/pesanan");
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fpesanan/);
    await page.getByLabel("Email").fill("superadmin@kamee.id");
    await page.locator("input[name=password]").fill("salah");
    await page.getByRole("button", { name: "Masuk" }).click();
    await expect(page.getByText("Email atau kata sandi salah.")).toBeVisible();
  });

  test("Super Admin: ringkasan, semua menu, dan cookie httpOnly", async ({ page, context }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await login(page, "superadmin@kamee.id");

    for (const label of ["Total penjualan", "Total pesanan", "Pelanggan baru"]) {
      await expect(page.getByText(label, { exact: false }).first()).toBeVisible();
    }
    await expect(page.getByRole("heading", { name: /Top 5 produk/ })).toBeVisible();
    for (const label of ["Pengaturan", "Pengguna", "Promo & Voucher", "Laporan"]) {
      await expect(sidebar(page).getByRole("link", { name: label })).toBeVisible();
    }

    // Token hanya di cookie httpOnly, tidak pernah di storage browser
    const cookie = (await context.cookies()).find((c) => c.name === "kamee_admin");
    expect(cookie?.httpOnly).toBe(true);
    const leaked = await page.evaluate(() => JSON.stringify({ ...localStorage }).includes("mock-token"));
    expect(leaked).toBe(false);
    expect(errors).toEqual([]);
  });

  test("Pesanan: Kanban, ubah status, dan tampilan tabel", async ({ page }) => {
    await login(page, "superadmin@kamee.id");
    await page.goto("/admin/pesanan");
    await expect(page.locator("section[aria-label^='Pending']")).toBeVisible();

    const advance = page.getByRole("button", { name: /^(Proses pesanan|Kirim pesanan|Tandai selesai)$/ }).first();
    await expect(advance).toBeVisible();
    await advance.click();
    await expect(page.getByText(/Status pesanan diperbarui/)).toBeVisible();

    await page.getByRole("radio", { name: "Tabel" }).click();
    await expect(page.getByRole("table", { name: "Daftar pesanan" })).toBeVisible();
    await expect(page.getByText(/Menampilkan \d+–\d+ dari \d+/)).toBeVisible();
  });

  test("Produk: buat lalu hapus dengan konfirmasi", async ({ page }) => {
    await login(page, "superadmin@kamee.id");
    await page.goto("/admin/produk/baru");
    const name = `Kopi Uji ${Date.now()}`;
    await page.getByLabel("Nama produk").fill(name);
    await page.getByLabel("Kategori").selectOption({ index: 1 });
    await page.getByLabel(/Harga dasar/).fill("21000");
    await page.getByRole("button", { name: "Simpan produk" }).first().click();
    await expect(page).toHaveURL(/\/admin\/produk\/\d+$/);

    await page.getByRole("button", { name: "Hapus", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText(name);
    await dialog.getByRole("button", { name: "Hapus produk" }).click();
    await expect(page).toHaveURL(/\/admin\/produk(\?.*)?$/);
  });

  test("Admin Outlet: menu terbatas dan halaman Super Admin ditolak", async ({ page }) => {
    await login(page, "admin.cikokol@kamee.id");
    await expect(page.getByText("Admin Outlet").first()).toBeVisible();
    for (const hidden of ["Pengaturan", "Pengguna", "Promo & Voucher", "Kategori"]) {
      await expect(sidebar(page).getByRole("link", { name: hidden })).toHaveCount(0);
    }
    await page.goto("/admin/pengaturan");
    await expect(page.getByRole("heading", { name: "Akses terbatas" })).toBeVisible();

    await page.goto("/admin/produk");
    await expect(page.getByRole("link", { name: /Tambah produk/ })).toHaveCount(0);
  });

  test("Struk 58 mm dapat dibuka dari detail pesanan", async ({ page }) => {
    await login(page, "superadmin@kamee.id");
    await page.goto("/admin/struk/1");
    await expect(page.getByRole("article").getByText("KAMEE COFFEE", { exact: true })).toBeVisible();
    await expect(page.getByText("TOTAL", { exact: true })).toBeVisible();
    const width = await page.getByRole("article").evaluate((el) => el.getBoundingClientRect().width);
    expect(Math.round(width)).toBeGreaterThanOrEqual(215); // 58 mm ≈ 219 px
    expect(Math.round(width)).toBeLessThanOrEqual(222);
  });
});
