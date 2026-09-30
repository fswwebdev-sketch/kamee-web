# kamee-web

Situs pemesanan **Kamee Coffee**, dibangun dengan Next.js 15 (App Router, RSC), TypeScript strict, dan Tailwind CSS v4.
Situs ini mencakup landing, menu, detail produk, keranjang, checkout (QRIS/e-wallet/transfer/cash), lacak pesanan, blog, kontak, dan akun pelanggan (login OTP WhatsApp).
Semua data diambil dari `kamee-api` (`/api/v1`). Mock MSW bawaan membuat UI bisa jalan penuh **tanpa backend**.

| Kebutuhan | Pustaka |
|---|---|
| Server state & polling | TanStack Query 5 |
| Keranjang, auth, favorit (persist `localStorage`) | Zustand 5 |
| Form & validasi | React Hook Form + Zod |
| Animasi (menghormati `prefers-reduced-motion`) | Framer Motion (LazyMotion) + CSS |
| Tema terang/gelap lewat token | next-themes |
| Ikon | lucide-react |
| Carousel promo / peta alamat | Embla / Leaflet (keduanya lewat dynamic import) |
| Tes | Vitest + Testing Library, Playwright |

---

## Menjalankan

```bash
cp .env.example .env.local        # default: NEXT_PUBLIC_API_MOCKING=enabled
npm install
npm run dev                       # http://localhost:3000
```

| Skrip | Fungsi |
|---|---|
| `npm run dev` / `npm run build` / `npm start` | Jalur standar Next.js |
| `npm run dev:offline` / `npm run build:offline` | Sama, tetapi font Google diganti file lokal `@fontsource`. Pakai skrip ini untuk CI/sandbox tanpa akses `fonts.googleapis.com`. |
| `npm run lint` / `npm run typecheck` | ESLint (next/core-web-vitals) / `tsc --noEmit` |
| `npm test` | Vitest: logika keranjang |
| `npm run test:e2e` | Playwright: alur menu → checkout (build produksi + mock, port 3100) |
| `npm run images` | Membuat ulang gambar placeholder (`scripts/generate-placeholder-images.py`, butuh Pillow) |

### Mode mock (MSW)

Mode mock aktif jika `NEXT_PUBLIC_API_MOCKING=enabled`.

- **Browser:** service worker `public/mockServiceWorker.js` menangani semua endpoint `/api/v1`.
- **Server (RSC/ISR):** `mocks/server-fetch.ts` menjawab lewat `getResponse` dari MSW. Tidak ada patch `fetch` global.
- **"Database" mock:** tersimpan di `localStorage` (`kamee-mock-db`). Pesanan, login, favorit, dan alamat bertahan setelah reload. Untuk reset, hapus key tersebut.

Skenario yang bisa dicoba:

| Skenario | Cara |
|---|---|
| Login | Nomor apa pun. **OTP `123456`**. Nomor `081234567890` = akun demo *Dinda* (240 poin, tier Silver, 1 alamat). |
| Voucher | `KAMEEHEMAT` (20%, min. Rp40.000), `GRATISONGKIR` (min. Rp50.000, delivery), `BELI1GRATIS1`, `NGOPI10K` (min. Rp75.000) |
| Pembayaran | QRIS/e-wallet/VA otomatis **lunas setelah ±6 detik**, lalu status berjalan: diproses (15 dtk) → siap/diantar → selesai (45 dtk). Pesanan belum bayar batal otomatis setelah 15 menit. |
| Pesan via WhatsApp | `POST /orders/whatsapp` → tab `wa.me` berisi ringkasan pesanan |

### Menghubungkan ke kamee-api

```dotenv
NEXT_PUBLIC_API_MOCKING=disabled
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

- **Gambar.** Gambar dari `{API host}/storage/**` otomatis diizinkan di `next.config.ts` (`images.remotePatterns` diturunkan dari `NEXT_PUBLIC_API_URL`). Tambahkan host CDN jika gambar dipindah.
- **Rate limit (60 req/menit).** Build melakukan prerender (12 produk terlaris + blog), dan limit API bisa tersentuh. `serverApi()` sudah mencoba ulang 429 memakai header `Retry-After`. Untuk build di CI, naikkan limit untuk IP server web, atau reset limiter (`redis-cli FLUSHALL` di dev).
- **Pembayaran lokal.** Tanpa Midtrans, jalankan API dengan `PAYMENT_GATEWAY=fake` dan `QUEUE_CONNECTION=sync`.
- **On-demand ISR.** Halaman publik memakai ISR (5 menit). Admin/Laravel dapat memanggil revalidate saat produk/promo/blog berubah:
  ```bash
  curl -X POST https://kamee.id/api/revalidate \
    -H "x-revalidate-secret: $REVALIDATE_SECRET" -H "Content-Type: application/json" \
    -d '{"tags":["products","product:kopi-susu-aren"],"paths":["/menu"]}'
  ```
  Tag yang dipakai: `products`, `product:{slug}`, `categories`, `outlets`, `promotions`, `banners`, `blogs`, `blog:{slug}`, `testimonials`.

---

## Struktur

```
app/
  (public)/           landing, menu, menu/[slug], keranjang, checkout, pesanan/[code](/bayar),
                      promo, outlet, tentang, blog(/[slug]), kontak, masuk, akun/*
  api/revalidate/     webhook on-demand ISR
  sitemap.ts robots.ts manifest.ts opengraph-image.tsx
components/
  ui/                 design system (button, field, choice-card, badge, chip, dialog/bottom-sheet, tabs, toast, skeleton…)
  layout/ home/ menu/ product/ cart/ checkout/ orders/ account/ blog/ content/
features/             cart (pricing murni + store), auth, favorites, orders
lib/                  api client, format (Rupiah, WIB), seo (JSON-LD), whatsapp, hooks, queries/*, schemas/*
mocks/                data, handler MSW, db
tests/unit            Vitest
tests/e2e             Playwright
```

**Catatan desain.** Token warna, tipografi, radius, dan bayangan dari bagian 5 ada di `app/globals.css` (`@theme`), dengan override `.dark`.
Komponen hanya memakai token (`bg-surface`, `text-ink`, `text-muted`, `bg-primary`, …), jadi mode gelap tidak memerlukan kelas `dark:` di komponen.

---

## Kualitas

### SEO

- `generateMetadata` di setiap halaman dinamis; canonical & Open Graph lewat `lib/seo.ts`.
- JSON-LD: `CafeOrCoffeeShop` (landing, dengan semua outlet), `Product` + `AggregateRating` + `BreadcrumbList` (detail), dan `BlogPosting`.
- OG image dinamis untuk situs, produk, dan artikel; `sitemap.ts` (produk, kategori, blog); `robots.ts` (menutup keranjang/checkout/akun).
- `htmlLimitedBots: /.*/` memastikan metadata ada di `<head>` awal, bukan di-stream.

### Aksesibilitas (WCAG AA)

- Skip link, landmark, dan urutan heading.
- Fokus terlihat; focus trap di dialog/bottom sheet.
- Kontras ≥ 4.5:1 di kedua tema (hijau WhatsApp disesuaikan ke `#1A7F46`).
- Label form & pesan error terhubung `aria-describedby`.
- `aria-live` untuk jumlah hasil & status pembayaran.
- Semua animasi mati di `prefers-reduced-motion`.

### Performa

Yang sudah diterapkan:

- **Gambar:** `next/image` (AVIF/WebP) + `fetchPriority="high"` untuk gambar LCP.
- **Font & animasi:** `next/font`; hero dianimasikan dengan CSS saja.
- **Pemuatan tertunda:** Framer Motion lewat `LazyMotion` async. Leaflet, Embla, Google Maps, Toaster, dan variant sheet dimuat lewat dynamic import. Ulasan produk baru diambil saat mendekati viewport.
- **HTML lebih kecil:** rating bintang memakai CSS mask (HTML menu turun ±37%).
- **ISR + skeleton** di semua rute data.

Hasil Lighthouse mobile (default throttling), build produksi terhadap `kamee-api` asli, median 3 kali run:

| Halaman | Performa | Aksesibilitas | Best Practices | SEO |
|---|---|---|---|---|
| `/` | 90 | 100 | 100 | 100 |
| `/menu` | 89 | 100 | 100 | 100 |
| `/menu/kopi-susu-aren` | 91 | 100 | 100 | 100 |
| `/promo` | 95 | 100 | 100 | 100 |
| `/blog` | 93 | 100 | 100 | 100 |
| `/tentang` | 94 | 100 | 100 | 100 |
| `/kontak` | 98 | 100 | 100 | 100 |

CLS = 0 di semua halaman. Pengukuran dilakukan di mesin 2 core yang juga menjalankan Laravel, MySQL, dan Redis, sehingga skor Performa berfluktuasi ±8 poin antar run. Ukur ulang di infrastruktur produksi dengan CDN untuk gambar.

Catatan pengukuran:

- **Jangan ukur dalam mode mock.** Service worker MSW ikut terhitung dan menurunkan skor.
- **Panaskan cache optimizer gambar** dengan satu kunjungan sebelum mengukur.

### Tes

```bash
npm test                         # 21 tes unit: harga, opsi varian, merge baris, store (undo, catatan, persist)
E2E_OFFLINE=1 npm run test:e2e   # 8 tes (Pixel 7 + Desktop Chrome)
```

Alur e2e:

1. Cari "aren" (debounce), pilih varian, lalu tambah ke keranjang.
2. Di keranjang: ubah qty, lalu pakai voucher `KAMEEHEMAT`.
3. Checkout, lalu halaman QRIS (countdown + polling).
4. Setelah pembayaran lunas, halaman otomatis pindah ke pelacakan.

Tes e2e lainnya:

- validasi nomor WA;
- "Pesan via WhatsApp" (memastikan `POST /orders/whatsapp` terkirim dan tab `wa.me` terbuka);
- keranjang kosong.

Untuk menguji server yang sudah berjalan: `E2E_BASE_URL=http://localhost:3000 npm run test:e2e`.

---

## Yang perlu diganti / belum dicakup

- **Gambar placeholder.** Semua gambar di `public/hero`, `public/images/**`, `public/icons` dibuat oleh skrip (ilustrasi datar). Ganti dengan foto asli dengan nama file yang sama. Gambar produk dari API mengikuti `image_url` di database.
- **Data kontak.** Nomor WhatsApp, akun sosial, dan email ada di `.env`. Koordinat outlet diambil dari API.
- **Panel admin.** Route group `(admin)` di struktur folder bagian 9 **tidak dibangun**, karena tidak termasuk daftar halaman permintaan ini. Semua endpoint admin sudah tersedia di kamee-api.
- **Realtime.** Status pesanan & pembayaran memakai polling: 3 dtk di halaman bayar, 15 dtk di lacak pesanan. Laravel Reverb/Echo belum diintegrasikan; titik sambungnya ada di `lib/queries/orders.ts` (ganti `refetchInterval` dengan listener channel `orders.{code}`).
- **Turnstile.** Form kontak menampilkan Cloudflare Turnstile hanya jika `NEXT_PUBLIC_TURNSTILE_SITE_KEY` diisi.
