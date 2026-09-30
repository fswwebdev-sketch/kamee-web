# kamee-web

Situs pemesanan **Kamee Coffee**, dibangun dengan Next.js 15 (App Router, RSC), TypeScript strict, dan Tailwind CSS v4.
Situs ini mencakup landing, menu, detail produk, keranjang, checkout (QRIS/e-wallet/transfer/cash), lacak pesanan, blog, kontak, dan akun pelanggan (login OTP WhatsApp), plus **dashboard admin** di `/admin` (lihat [Dashboard admin](#dashboard-admin)).
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
| `npm run test:e2e` | Playwright: alur menu → checkout & panel admin (build produksi + mock, port 3100) |
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
  (admin)/admin/      login, (panel)/* halaman dashboard, struk/[id] (cetak 58 mm)
  api/admin/[...path] BFF proxy admin → kamee-api /api/v1/admin (cookie httpOnly)
  api/revalidate/     webhook on-demand ISR
  sitemap.ts robots.ts manifest.ts opengraph-image.tsx
components/
  ui/                 design system (button, field, choice-card, badge, chip, dialog/bottom-sheet, tabs, toast, skeleton…)
  layout/ home/ menu/ product/ cart/ checkout/ orders/ account/ blog/ content/
  admin/              ui/ (DataTable, confirm, filter, StatCard…), layout/, dashboard/, orders/, catalog/,
                      marketing/, blog/, customers/, contacts/, system/, reports/
features/             cart (pricing murni + store), auth, favorites, orders, admin (suara, status realtime)
lib/                  api client, format (Rupiah, WIB), seo (JSON-LD), whatsapp, hooks, queries/*, schemas/*
lib/admin/            api client admin, queries, permissions (role & transisi status), nav, form helpers
mocks/                data, handler MSW, db; mocks/admin/ (seluruh endpoint admin)
middleware.ts         penjaga rute /admin (tanpa cookie sesi → login)
tests/unit            Vitest
tests/e2e             Playwright
```

**Catatan desain.** Token warna, tipografi, radius, dan bayangan dari bagian 5 ada di `app/globals.css` (`@theme`), dengan override `.dark`.
Komponen hanya memakai token (`bg-surface`, `text-ink`, `text-muted`, `bg-primary`, …), jadi mode gelap tidak memerlukan kelas `dark:` di komponen.

---

## Dashboard admin

Panel untuk pemilik & staf outlet di `/admin`, memakai endpoint `/api/v1/admin` kamee-api.

| Halaman | Isi |
|---|---|
| Ringkasan | Filter outlet & periode; StatCard penjualan, pesanan, AOV, pelanggan baru (+ % vs periode sebelumnya); grafik pendapatan harian/bulanan (Recharts); top 5 produk; pesanan terbaru |
| Pesanan | Kanban (Pending → Diproses → Dikirim → Selesai / Dibatalkan, drag & drop mouse/sentuh/keyboard) + tabel dengan filter & paginasi server; detail (item, opsi, pembayaran, log status); ubah status; refund (Super Admin); cetak struk 58 mm |
| Produk, Kategori, Opsi Varian | CRUD; galeri multi-gambar dengan drag reorder; toggle aktif; stok tersedia/habis per outlet; aksi massal |
| Promo & Voucher, Banner | CRUD dengan jadwal tayang (Terjadwal/Berjalan/Berakhir) dan pratinjau langsung |
| Blog | Daftar, editor dengan pratinjau & penjadwalan, kategori blog |
| Pelanggan | Daftar, riwayat pembelian, total transaksi, tier, saldo & riwayat poin, koreksi poin |
| Pesan Masuk, Outlet, Pengguna, Pengaturan | Inbox kontak; outlet & jam buka; akun admin & role; ongkir, jam buka default, rasio poin, nomor WA |
| Laporan | Per hari/bulan/produk/outlet/metode bayar; ekspor Excel (ringkasan tab atau semua transaksi) |

**Akun.** Seeder kamee-api dan mock memakai akun yang sama (sandi `password`):
- `superadmin@kamee.id` (Super Admin)
- `admin.cikokol@kamee.id` (Admin Outlet)

### Keamanan & role

- **Sesi.** Login email + sandi lewat proxy `app/api/admin/[...path]`. Token Sanctum disimpan di cookie **httpOnly** (`SameSite=Lax`, `Secure` di HTTPS; 12 jam, atau 30 hari bila "Ingat saya"), jadi JavaScript di browser tidak pernah melihat token.
- **CSRF.** Request yang mengubah data wajib membawa header `X-Requested-With` dan berasal dari origin yang sama.
- **Penjaga rute.** `middleware.ts` mengarahkan ke login bila tidak ada sesi.
- **Role di UI.** Menu dan tombol disembunyikan sesuai role (`lib/admin/permissions.ts`):
  - Admin Outlet hanya melihat Ringkasan, Pesanan, Laporan, Produk (baca + stok outletnya), Pelanggan (tanpa koreksi poin), Pesan Masuk, dan Outlet (baca).
  - Halaman Super Admin yang dibuka langsung menampilkan "Akses terbatas".
- **Otorisasi tetap di backend.** Policy + OutletScope kamee-api tetap menjadi penentu: sudah diuji bahwa Admin Outlet mendapat 403/404 untuk ubah produk, pengaturan, pengguna, promo, pesanan outlet lain, stok outlet lain, dan koreksi poin.

### Realtime (Laravel Echo + Reverb)

- **Channel.** Panel berlangganan channel privat `outlet.{id}`. Super Admin berlangganan semua outlet, Admin Outlet hanya outletnya.
- **Event.** Mendengarkan `.order.created` & `.order.status_updated`. Otorisasi channel lewat proxy (`/api/admin/broadcasting/auth`), jadi token tetap tidak keluar dari cookie.
- **Pesanan baru.** Muncul toast + nada notifikasi (Web Audio, tanpa file). Suara bisa dimatikan di topbar, dan aktif setelah interaksi pertama sesuai aturan autoplay browser. Kanban dan ringkasan diperbarui otomatis.
- **Fallback.** Tanpa `NEXT_PUBLIC_REVERB_APP_KEY` atau saat koneksi WebSocket putus, panel otomatis polling setiap 20 detik. Status koneksi tampil di topbar (Live / Polling / Menyambung).
- **Mode mock.** Pesanan baru disimulasikan setiap ±1 menit.
- **Menjalankan lokal.** Di kamee-api set `BROADCAST_CONNECTION=reverb` lalu `php artisan reverb:start`. Di kamee-web isi variabel `NEXT_PUBLIC_REVERB_*` (lihat `.env.example`).
- **Sudah diuji ujung ke ujung.** Pesanan dibuat lewat API publik, lalu toast muncul < 50 ms setelah event, nada berbunyi, dan kartu masuk ke Kanban.

### Struk 58 mm

Tombol **Cetak struk** membuka `/admin/struk/{id}?print=1` di jendela kecil, lalu dialog cetak terbuka otomatis. Struk memakai `@page { size: 58mm auto; margin: 0 }` dengan area isi ±48 mm, monospace, dan selalu hitam-putih. Pilih printer thermal dan atur margin **None** di dialog cetak.

### Catatan untuk backend (kamee-api)

Perubahan kecil di kamee-api yang dibutuhkan dashboard (sudah termasuk di paket kamee-api, 190 tes lulus):

- **Rate limit admin.** Rute admin kini memakai limiter `admin` sendiri: 300 req/menit per akun, bisa diatur lewat `KAMEE_ADMIN_RATE_LIMIT`. Sebelumnya rute admin ikut limiter publik 60/menit, yang mudah tersentuh oleh Kanban + realtime.
- **Detail pelanggan.** `recent_orders` kini memuat outlet, dan `stats.last_order_at` dikirim dalam format ISO 8601.
- **Batas unggah.** `docker/php/php.ini`: `post_max_size` dinaikkan ke 32M, karena galeri bisa mengunggah 8 × 3 MB sekaligus. Untuk `php artisan serve` lokal, naikkan juga `upload_max_filesize` ≥ 3M dan `post_max_size` ≥ 32M di php.ini sistem.

Keterbatasan API yang ditangani di UI:

- **Format gambar.** Aturan `image` Laravel tidak menerima AVIF. Unggahan dibatasi JPG/PNG/WebP/GIF.
- **Endpoint yang belum ada:**
  - restore produk terhapus (hanya bisa dilihat lewat filter "Terhapus");
  - daftar tier loyalitas (filter tier diturunkan dari data pelanggan).
- **Hapus promo.** Promo yang sudah pernah dipakai hanya dinonaktifkan oleh backend; UI menyebutnya "Nonaktifkan".
- **Kanban.** Menampilkan maksimal 50 pesanan aktif terbaru (batas `per_page` API). Lebih dari itu, muncul pemberitahuan untuk memakai pencarian atau tampilan Tabel.

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
E2E_OFFLINE=1 npm run test:e2e   # 20 tes (Pixel 7 + Desktop Chrome): 4 alur toko + 6 alur admin
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

Tes e2e admin (terhadap mock admin):

- redirect tanpa sesi & sandi salah;
- ringkasan + cookie httpOnly (token tidak ada di storage);
- Kanban ubah status & tampilan tabel;
- buat lalu hapus produk dengan konfirmasi;
- menu terbatas Admin Outlet;
- struk 58 mm.

Untuk menguji server yang sudah berjalan: `E2E_BASE_URL=http://localhost:3000 npm run test:e2e`.

---

## Yang perlu diganti / belum dicakup

- **Gambar placeholder.** Semua gambar di `public/hero`, `public/images/**`, `public/icons` dibuat oleh skrip (ilustrasi datar). Ganti dengan foto asli dengan nama file yang sama. Gambar produk dari API mengikuti `image_url` di database.
- **Data kontak.** Nomor WhatsApp, akun sosial, dan email ada di `.env`. Koordinat outlet diambil dari API.
- **Realtime sisi pelanggan.** Dashboard admin sudah memakai Reverb, tetapi halaman bayar & lacak pesanan pelanggan masih polling (3 dtk / 15 dtk). Channel `order.{code}` sudah tersedia di backend bila ingin disambungkan.
- **Turnstile.** Form kontak menampilkan Cloudflare Turnstile hanya jika `NEXT_PUBLIC_TURNSTILE_SITE_KEY` diisi.
