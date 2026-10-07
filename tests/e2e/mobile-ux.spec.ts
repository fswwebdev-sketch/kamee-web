import { expect, test, type Page } from "@playwright/test";

/**
 * Audit UX ponsel (360–430 px) — dijalankan di proyek iphone-14, pixel-7, galaxy-a.
 * Terhadap build produksi dengan mock MSW (lihat playwright.config.ts).
 */

const MIN_TARGET = 44;

/** Elemen interaktif yang terlihat dengan area sentuh < 44 px (WCAG 2.5.5/2.5.8). */
async function smallTargets(page: Page): Promise<string[]> {
  return page.evaluate((min) => {
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      if (r.width === 0 || r.height === 0 || cs.visibility === "hidden" || el.closest("[aria-hidden=true],[inert]")) return false;
      // Elemen sr-only (mis. skip link) hanya muncul saat fokus keyboard
      if (cs.position === "absolute" && r.width <= 1 && r.height <= 1) return false;
      if (cs.clip === "rect(0px, 0px, 0px, 0px)" || cs.clipPath === "inset(50%)") return false;
      return r.bottom > 0 && r.top < window.innerHeight * 3;
    };
    const out: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>("a[href],button,input:not([type=hidden]),select,textarea,[role=button],[role=tab],[role=switch],[role=radio],summary")) {
      if (!visible(el)) continue;
      // Pengecualian WCAG: tautan inline di dalam kalimat
      if (el.tagName === "A" && getComputedStyle(el).display === "inline" && (el.parentElement?.innerText.trim().length ?? 0) > el.innerText.trim().length + 3) continue;
      let target: Element = el;
      if (el.hasAttribute("data-stretched")) target = el.closest("article") ?? el; // stretched link: seluruh kartu
      if ((el as HTMLInputElement).type === "checkbox" || (el as HTMLInputElement).type === "radio") target = el.closest("label") ?? el;
      const r = target.getBoundingClientRect();
      if (r.width < min - 0.5 || r.height < min - 0.5) out.push(`${el.tagName.toLowerCase()} "${(el.getAttribute("aria-label") || el.innerText || "").trim().slice(0, 30)}" ${Math.round(r.width)}×${Math.round(r.height)}`);
    }
    return out;
  }, MIN_TARGET);
}

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, "halaman tidak boleh bisa digeser ke samping").toBeLessThanOrEqual(0);
}

async function addArenKame(page: Page) {
  await page.goto("/menu?q=aren");
  await page.getByRole("button", { name: /Tambah Aren Kame Reguler ke keranjang/ }).first().click();
  const sheet = page.getByRole("dialog");
  await sheet.getByRole("button", { name: /^Tambah ·/ }).click();
  await expect(sheet).toBeHidden();
}

test.describe("UX ponsel", () => {
  test("tanpa scroll horizontal & target sentuh ≥ 44 px di halaman utama", async ({ page }) => {
    const pages = ["/", "/menu", "/menu/aren-kame", "/promo", "/blog", "/kontak", "/masuk", "/pesanan"];
    const report: Record<string, string[]> = {};
    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expectNoHorizontalScroll(page);
      const small = await smallTargets(page);
      if (small.length) report[path] = small;
    }
    await addArenKame(page);
    for (const path of ["/keranjang", "/checkout"]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await expectNoHorizontalScroll(page);
      const small = await smallTargets(page);
      if (small.length) report[path] = small;
    }
    expect(report).toEqual({});
  });

  test("bottom nav 4 tab, sembunyi saat keyboard terbuka & di alur checkout", async ({ page }) => {
    await page.goto("/menu");
    const nav = page.getByRole("navigation", { name: "Navigasi bawah" });
    await expect(nav.getByRole("link")).toHaveText(["Beranda", "Menu", "Promo", "Akun"]);
    await expect(nav.getByRole("link", { name: "Menu" })).toHaveAttribute("aria-current", "page");

    // Fokus ke kolom pencarian = keyboard virtual terbuka di perangkat sentuh
    await page.getByLabel("Cari menu").focus();
    await expect(page.locator("html")).toHaveAttribute("data-keyboard", "open");
    await expect(nav).toBeHidden();
    await page.getByLabel("Cari menu").blur();
    await expect(nav).toBeVisible();

    // Sticky cart bar di atas tab bar
    await addArenKame(page);
    await page.goto("/menu");
    const cartBar = page.getByRole("link", { name: /Lihat Keranjang/ });
    await expect(cartBar).toBeVisible();
    const [barBox, navBox] = [await cartBar.boundingBox(), await nav.boundingBox()];
    expect(barBox!.y + barBox!.height).toBeLessThanOrEqual(navBox!.y);

    await page.goto("/checkout");
    await expect(page.getByRole("navigation", { name: "Navigasi bawah" })).toHaveCount(0);
  });

  test("varian dalam bottom sheet dapat ditutup dengan swipe ke bawah", async ({ page }) => {
    await page.goto("/menu?q=aren");
    await page.getByRole("button", { name: /Tambah Aren Kame Reguler ke keranjang/ }).first().click();
    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    await page.waitForTimeout(500); // tunggu animasi masuk selesai sebelum mengukur pegangan

    // Swipe pendek → kembali ke posisi semula
    const h = (await page.locator("[data-sheet-handle]").boundingBox())!;
    const x = h.x + h.width / 2;
    await page.mouse.move(x, h.y + 8);
    await page.mouse.down();
    await page.mouse.move(x, h.y + 48, { steps: 4 });
    await page.mouse.up();
    await page.waitForTimeout(400);
    await expect(sheet).toBeVisible();

    // Swipe panjang → tertutup
    await page.mouse.move(x, h.y + 8);
    await page.mouse.down();
    await page.mouse.move(x, h.y + 300, { steps: 12 });
    await page.mouse.up();
    await expect(sheet).toBeHidden();
  });

  test("filter & urutan menu lewat bottom sheet", async ({ page }) => {
    await page.goto("/menu");
    await page.getByRole("button", { name: /Filter & urutkan/ }).click();
    const sheet = page.getByRole("dialog", { name: "Filter & urutkan" });
    await sheet.getByRole("radio", { name: "Harga termahal" }).click();
    await sheet.getByRole("radio", { name: "Based Coffee", exact: true }).click();
    await sheet.getByRole("button", { name: "Terapkan" }).click();
    await expect(page).toHaveURL(/kategori=based-coffee/);
    await expect(page).toHaveURL(/urut=-price/);
    await expect(page.getByRole("button", { name: /Filter & urutkan/ })).toContainText("2");
  });

  test("checkout satu kolom: ringkasan dapat dilipat & tombol bayar sticky", async ({ page }) => {
    await addArenKame(page);
    await page.goto("/checkout");
    const toggle = page.getByRole("button", { name: /Ringkasan pesanan/ });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator("#ringkasan-pesanan").getByText("1× Aren Kame Reguler")).toBeVisible();

    const pay = page.getByTestId("submit-order").filter({ visible: true });
    await expect(pay).toBeInViewport();
    await page.mouse.wheel(0, 1500);
    await expect(pay).toBeInViewport(); // tetap menempel saat menggulir

    // Input: keyboard yang tepat + autofill
    await expect(page.getByLabel("Nama")).toHaveAttribute("autocomplete", "name");
    const wa = page.getByLabel("Nomor WhatsApp");
    await expect(wa).toHaveAttribute("type", "tel");
    await expect(wa).toHaveAttribute("autocomplete", "tel");
    const fontSize = await wa.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(fontSize, "≥ 16 px agar iOS tidak zoom saat fokus").toBeGreaterThanOrEqual(16);
  });

  test("QRIS statis: Simpan QR, nominal & bukti WhatsApp; hanya QRIS + Tunai", async ({ page }) => {
    await addArenKame(page);
    await page.goto("/checkout");
    // Metode yang aktif: QRIS & Tunai (e-wallet/VA hanya bila memakai payment gateway)
    await expect(page.getByRole("radio", { name: /QRIS/ })).toBeChecked();
    await expect(page.getByRole("radio", { name: /Tunai/ })).toHaveCount(1);
    await expect(page.getByRole("radio", { name: /E-Wallet|Transfer Bank/ })).toHaveCount(0);
    await page.getByLabel("Nama").fill("Dinda Putri");
    await page.getByLabel("Nomor WhatsApp").fill("081234567890");
    // Tombol bayar sticky disembunyikan selama keyboard terbuka → tutup keyboard dulu
    await page.getByLabel("Nomor WhatsApp").blur();
    const pay = page.getByTestId("submit-order").filter({ visible: true });
    await expect(pay).toBeInViewport();
    await pay.click();
    await expect(page).toHaveURL(/\/bayar/, { timeout: 20_000 });
    await expect(page.getByTestId("static-qris")).toBeVisible();
    await expect(page.getByRole("button", { name: "Simpan QR" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Kirim bukti bayar via WhatsApp/ })).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test("tarik untuk memuat ulang riwayat pesanan", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "simulasi sentuh via CDP");
    await page.goto("/masuk");
    await page.getByLabel("Nomor WhatsApp").fill("081234567890");
    await page.getByRole("button", { name: /Kirim Kode OTP/ }).click();
    await page.getByLabel("Digit 1").fill("1");
    // Kode 6 digit terkirim otomatis setelah digit terakhir
    for (let i = 2; i <= 6; i++) await page.getByLabel(`Digit ${i}`).fill(String(i));
    await page.waitForURL(/\/akun/);
    await page.goto("/akun/pesanan");
    await page.waitForLoadState("networkidle");

    let fetched = 0;
    page.on("request", (r) => r.url().includes("/me/orders") && fetched++);
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: "touchStart" | "touchMove" | "touchEnd", y: number) =>
      cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x: 180, y }] });
    await touch("touchStart", 200);
    for (let y = 220; y <= 420; y += 20) await touch("touchMove", y);
    await expect(page.getByTestId("ptr-indicator")).toHaveCSS("opacity", "1");
    await touch("touchEnd", 420);
    await expect.poll(() => fetched).toBeGreaterThan(0);
  });

  test("ajakan 'Tambahkan ke layar utama': prompt browser (Android) / panduan Bagikan (iOS)", async ({ page }, testInfo) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle"); // listener dipasang setelah hidrasi
    const ios = testInfo.project.name.startsWith("iphone");
    if (!ios) {
      await page.evaluate(() => {
        const w = window as unknown as { __prompted: boolean };
        w.__prompted = false;
        const e = new Event("beforeinstallprompt", { cancelable: true }) as Event & { prompt: () => Promise<void>; userChoice: Promise<unknown> };
        e.prompt = async () => { w.__prompted = true; };
        e.userChoice = Promise.resolve({ outcome: "accepted", platform: "web" });
        window.dispatchEvent(e);
      });
    }
    const banner = page.getByRole("region", { name: "Pasang aplikasi Kamee" });
    await expect(banner).toBeVisible({ timeout: 8000 });
    await banner.getByRole("button", { name: "Pasang", exact: true }).click();
    if (ios) {
      // iOS Safari tidak punya beforeinstallprompt → panduan Bagikan → Tambah ke Layar Utama
      const sheet = page.getByRole("dialog", { name: "Tambahkan ke layar utama" });
      await expect(sheet).toContainText("Tambah ke Layar Utama");
      await sheet.getByRole("button", { name: "Mengerti" }).click();
    } else {
      await expect.poll(() => page.evaluate(() => (window as unknown as { __prompted: boolean }).__prompted)).toBe(true);
    }
    await expect(banner).toBeHidden();
  });

  test("manifest PWA, ikon, splash & halaman offline tersedia", async ({ page, request }) => {
    await page.goto("/");
    const href = await page.locator('link[rel="manifest"]').getAttribute("href");
    const manifest = await (await request.get(href!)).json();
    expect(manifest).toMatchObject({ display: "standalone", start_url: expect.stringContaining("/"), theme_color: "#04338B", lang: "id" });
    expect(manifest.icons.some((i: { purpose?: string }) => i.purpose === "maskable")).toBe(true);
    for (const icon of [...manifest.icons, ...manifest.shortcuts.flatMap((s: { icons: unknown[] }) => s.icons), ...manifest.screenshots]) {
      expect((await request.get((icon as { src: string }).src)).status(), (icon as { src: string }).src).toBe(200);
    }
    await expect(page.locator('meta[name="apple-mobile-web-app-capable"]')).toHaveAttribute("content", "yes");
    const splash = await page.locator('link[rel="apple-touch-startup-image"]').evaluateAll((els) => els.map((e) => (e as HTMLLinkElement).href));
    expect(splash.length).toBeGreaterThanOrEqual(8);
    expect((await request.get(splash[0]!)).status()).toBe(200);
    const offline = await request.get("/offline.html");
    expect(offline.status()).toBe(200);
    expect(await offline.text()).toContain("Kamu sedang offline");
    expect((await request.get("/sw.js")).headers()["service-worker-allowed"]).toBe("/");
  });
});
