# kamee-web

Situs pemesanan **Kamee Coffee**, dibangun dengan Next.js 15 (App Router, RSC), TypeScript strict, dan Tailwind CSS v4.
Situs ini mencakup landing, menu, detail produk, keranjang, checkout (QRIS/e-wallet/transfer/cash), lacak pesanan, blog, kontak, dan akun pelanggan (login OTP WhatsApp), plus **dashboard admin** di `/admin` (lihat [Dashboard admin](#dashboard-admin)).
Semua data diambil dari `kamee-api` (`/api/v1`). Mock MSW bawaan membuat UI bisa jalan penuh **tanpa backend**.

### Data bisnis Kamee Coffee

| | |
|---|---|
| Outlet (satu-satunya) | **Kamee Coffee Taman Cibodas** — Jl. Cempaka Raya Blok I6 No. 3, Perumahan Taman Cibodas, Sangiang Jaya, Kec. Periuk, Kota Tangerang. Koordinat perkiraan −6.1819, 106.5972 (ubah di Admin → Outlet bila pin kurang tepat). |
| Jam buka | Setiap hari 10.00–17.00 WIB |
| WhatsApp | 0812-8087-1630 (`NEXT_PUBLIC_WHATSAPP_NUMBER=6281280871630`) |
| Warna brand | Biru navy Kame `#04338B` + putih (token di `app/globals.css`; ilustrasi & ikon hanya biru-putih) |
| Menu | 19 menu sesuai daftar menu outlet: Based Coffee (Cup / Bottle 250 ml / Bottle 1 L), Manual Brew, Non Coffee. 👍 di menu = *Best Seller*. Mont Blanc & Cold Brew hanya akhir pekan. Rating, ulasan, jumlah terjual, komposisi, dan kalori sengaja kosong (disembunyikan) sampai ada data asli. |
| Pembayaran | **QRIS statis GoPay Merchant** (`KAMEECOFFEE`, NMID `ID1026594722880`, gambar `public/payments/qris-kameecoffee.jpg`) + **Tunai** di kasir. Lihat [Alur QRIS statis](#alur-qris-statis). |

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
| `npm run test:e2e` | Playwright: alur menu → checkout, panel admin, dan audit UX ponsel di iPhone 14 / Pixel 7 / Galaxy A (build produksi + mock, port 3100) |
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
| Pembayaran | QRIS statis: pesanan **tetap menunggu** sampai admin mengonfirmasi. Di mode demo, tombol *"Mode demo: simulasikan konfirmasi admin"* di halaman bayar menggantikan admin (DB mock admin terpisah di server). Setelah lunas status berjalan: diproses (15 dtk) → siap/diantar → selesai (45 dtk). Pesanan belum dibayar batal otomatis setelah 60 menit. |
| Pesan via WhatsApp | `POST /orders/whatsapp` → tab `wa.me` berisi ringkasan pesanan |

### Menghubungkan ke kamee-api

```dotenv
NEXT_PUBLIC_API_MOCKING=disabled
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

- **Gambar.** Gambar dari `{API host}/storage/**` otomatis diizinkan di `next.config.ts` (`images.remotePatterns` diturunkan dari `NEXT_PUBLIC_API_URL`). Tambahkan host CDN jika gambar dipindah.
- **Rate limit (60 req/menit).** Build melakukan prerender (12 produk terlaris + blog), dan limit API bisa tersentuh. `serverApi()` sudah mencoba ulang 429 memakai header `Retry-After`. Untuk build di CI, naikkan limit untuk IP server web, atau reset limiter (`redis-cli FLUSHALL` di dev).
- **Pembayaran.** Default `PAYMENT_GATEWAY=manual` (QRIS statis + konfirmasi admin) dan `KAMEE_PAYMENT_METHODS=qris,cash` di kamee-api; samakan `NEXT_PUBLIC_PAYMENT_METHODS` di kamee-web. E-wallet/VA hanya bila memakai `PAYMENT_GATEWAY=midtrans`.
- **On-demand ISR.** Halaman publik memakai ISR (5 menit). Admin/Laravel dapat memanggil revalidate saat produk/promo/blog berubah:
  ```bash
  curl -X POST https://kamee.id/api/revalidate \
    -H "x-revalidate-secret: $REVALIDATE_SECRET" -H "Content-Type: application/json" \
    -d '{"tags":["products","product:aren-kame"],"paths":["/menu"]}'
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
- `admin.cibodas@kamee.id` (Admin Outlet Taman Cibodas)

### Keuangan (Kasir, Bahan & Stok, Resep & HPP, Buku Kas, Ringkasan)

Menu **Keuangan** di admin (Super Admin & Admin Outlet):

| Halaman | Isi |
|---|---|
| Kasir `/admin/kasir` | Catat penjualan langsung di outlet: pilih menu + ukuran + qty, metode **Tunai / QRIS / Transfer** (bank, mis. BCA/BJB), uang diterima & kembalian, cetak struk. Pesanan langsung *Selesai* dan stok terpotong sesuai resep. |
| Bahan & Stok `/admin/bahan` | Bahan & kemasan: isi kemasan, harga kemasan → **harga per unit** (Sirup Gula Aren 1 liter Rp60.000 → Rp60/gr), stok sekarang, batas minimum, stok opname, riwayat mutasi, **Catat belanja stok** (otomatis masuk Buku Kas). |
| Resep & HPP `/admin/resep` | Takaran bahan per menu & ukuran → **HPP**, margin (Rp & %), dan **"cukup untuk N cup"** beserta bahan yang habis duluan. Resep bertanda *Contoh* masih perkiraan. |
| Buku Kas `/admin/keuangan/kas` | Uang masuk/keluar di luar pesanan (belanja, ongkir, gaji, penjualan dari catatan, modal) per metode bayar, dengan saldo periode. |
| Ringkasan Keuangan `/admin/keuangan` | Pemasukan per metode, pengeluaran per kategori, HPP, laba kotor, perkiraan laba bersih, arus kas, grafik harian, dan **menu terlaris** (qty per ukuran, omzet, HPP, laba) per periode. |

Aturan hitung:
- **HPP per sajian** = Σ (takaran × harga per unit bahan). Konversi espresso → biji kopi diasumsikan 1:2 (40 ml espresso ≈ 20 gr kopi). Es batu tidak dihitung di HPP (dicatat sebagai pengeluaran).
- **Stok** berkurang otomatis saat pesanan pertama kali terbayar/diproses (termasuk Kasir) dan kembali bila pesanan dibatalkan/refund. 1 cup/botol terjual = 1 kemasan berkurang.
- **Konfirmasi pembayaran** pesanan online kini mencatat metode sebenarnya: QRIS, Transfer (bank), atau Tunai.

Data awal diambil dari buku catatan pemilik 20–29 Sep 2026: belanja 20/9 Rp2.346.000 (termasuk es batu Rp25.000), pengeluaran lain Rp388.150 (pengeluaran pribadi tidak dicatat), dan pemasukan Rp1.111.000 (Transfer BCA/BJB & Tunai). Resep **Aren Kame** (Cup 12 oz & 1 L) adalah resep asli; resep menu lain masih contoh. Di mode mock, pesanan demo hanya dibuat mulai 1 Okt 2026 agar periode 20–29 Sep hanya berisi data asli.

### Alur QRIS statis

1. Pelanggan checkout memilih **QRIS** → halaman bayar menampilkan gambar QRIS toko, **nominal persis** (bisa disalin), kode pesanan, dan tombol **Simpan QR**.
2. Pelanggan memindai QR dengan GoPay/OVO/DANA/ShopeePay/m-banking, memasukkan nominal, lalu menekan **Kirim bukti bayar via WhatsApp** (pesan otomatis berisi kode & nominal ke 0812-8087-1630).
3. Admin mengecek dana di aplikasi **GoPay Merchant**, lalu di Kanban/detail pesanan menekan **Konfirmasi pembayaran** (kartu berlabel *Cek QRIS*). Endpoint: `POST /api/v1/admin/orders/{id}/confirm-payment`.
4. Pesanan berubah *Sudah dibayar*; halaman bayar pelanggan otomatis berpindah ke pelacakan. Belum dikonfirmasi dalam 60 menit → batal otomatis.

Refund pesanan QRIS dilakukan manual di luar sistem (transfer/GoPay), lalu tombol Refund hanya membatalkan pesanan.

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

## Pengalaman ponsel & PWA

Target 360–430 px, diuji di profil Playwright **iPhone 14** (390 px), **Pixel 7** (412 px), dan **Galaxy A** (360 px). Catatan: hanya Chromium yang terpasang di lingkungan CI ini, jadi profil iPhone memakai viewport/UA/DPR iPhone 14 di Chromium, bukan WebKit asli.

| Area | Implementasi |
|---|---|
| Navigasi | Tab bar 4 item (Beranda, Menu, Promo, Akun) + sticky cart bar di atasnya. Keduanya disembunyikan saat keyboard virtual terbuka (`features/ui/keyboard.tsx`: visualViewport + fokus input pada perangkat sentuh → `html[data-keyboard="open"]`, kelas `.hide-on-keyboard`). Di alur transaksi (keranjang, checkout, bayar) tab bar diganti bar aksi sticky. Lacak pesanan ada di Akun (juga untuk tamu). |
| Bottom sheet | `Dialog` = bottom sheet di ponsel dengan **swipe-to-close**: seret pegangan/kepala, atau konten saat sudah di posisi atas (`features/ui/use-sheet-drag.ts`, tanpa fitur drag Framer Motion agar bundle tetap kecil). Dipakai untuk pilihan varian, **Filter & urutkan** menu (draf diterapkan dengan tombol Terapkan), pesan via WhatsApp, alamat, dan panduan pasang iOS. |
| Target sentuh | Semua elemen interaktif ≥ 44 × 44 px di ponsel (ukuran ringkas dikembalikan mulai `md:` untuk desktop/admin). Kartu produk & blog memakai *stretched link* (seluruh kartu dapat diketuk). |
| Input | 16 px di ponsel (iOS tidak zoom saat fokus); `type="tel"` + `inputmode`, `autocomplete="name" / "tel" / "email" / "one-time-code" / "street-address"`, `enterkeyhint`, `autocapitalize` sesuai isian. |
| Safe area | `viewport-fit=cover`; header `pt-safe`, tab bar & bar aksi `pb-safe`, kontainer menghormati notch kiri/kanan saat landscape. |
| Galeri & daftar | Galeri produk swipe (scroll-snap, edge-to-edge, penghitung 1/3, `overscroll-x-contain` agar tidak memicu "back"). **Tarik untuk memuat ulang** di riwayat pesanan (`components/ui/pull-to-refresh.tsx`, plus tombol muat ulang untuk keyboard/pembaca layar). Skeleton di semua daftar & rute (`loading.tsx` promo, outlet, pesanan). |
| Checkout | Satu kolom di ponsel: ringkasan pesanan yang bisa dilipat di atas, tombol **Bayar** sticky di bawah (total selalu terlihat). QRIS: **Simpan QR** memakai Web Share API (lembar "Simpan Gambar" ke galeri) dengan fallback unduh; e-wallet: tombol deeplink "Buka aplikasi GoPay/ShopeePay…". |

### PWA

- **Manifest** (`app/manifest.ts`): `id`, `scope`, `display: standalone`, ikon *any* + *maskable* (192/512), shortcut **Menu** & **Lacak Pesanan** berikut ikonnya, dan screenshot untuk dialog pasang yang lebih kaya di Android.
- **Splash & ikon:**
  - iOS memakai `apple-touch-startup-image` untuk 9 ukuran iPhone + `apple-touch-icon`.
  - Android memakai `background_color` + ikon 512 dari manifest.
  - Buat ulang dengan `python3 scripts/generate-pwa-assets.py`.
- **Service worker** (`public/sw.js`):
  - **Navigasi halaman:** network-first (4 dtk), lalu fallback ke cache, lalu ke `/offline.html`.
  - **Payload RSC Next:** network-first, lalu fallback ke cache.
  - **`/_next/static`:** cache-first.
  - **Gambar & font:** stale-while-revalidate, maksimal 150 entri.
  - **API katalog publik** (produk, kategori, outlet, promo, banner, blog): network-first, lalu fallback ke cache. Jadi **menu yang pernah dibuka tetap tampil saat offline**.
  - **Tidak pernah dicache:** request non-GET, `/admin`, `/api/*`, request ber-`Authorization` (data akun), pesanan, dan pembayaran.
  - **Waktu registrasi:** saat browser senggang setelah `load`, agar tidak mengganggu LCP.
  - **Pembaruan:** bila ada versi baru, muncul toast "Muat ulang".
- **Halaman offline** (`public/offline.html`): HTML statis + CSS inline (tetap tampil tanpa jaringan), terang/gelap, tombol coba lagi, dan otomatis kembali saat koneksi pulih.
- **Tambahkan ke layar utama:**
  - Banner di beranda (ponsel) muncul setelah 4 detik dan bisa ditutup untuk 14 hari. Tombol yang sama ada di halaman Akun dan footer.
  - Android/Chrome memakai event `beforeinstallprompt`.
  - iOS Safari menampilkan panduan Bagikan → Tambah ke Layar Utama.
- **Mode mock:** satu origin hanya bisa punya satu service worker di scope `/`, dan saat mock aktif tempat itu dipakai MSW. Karena itu SW aplikasi hanya terdaftar di build **tanpa mock**. Tes offline (`tests/e2e/pwa.spec.ts`) dijalankan dengan:
  ```bash
  E2E_PWA=1 E2E_BASE_URL=http://localhost:3000 npx playwright test pwa --project=pixel-7
  ```

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

Hasil Lighthouse mobile (default throttling), build produksi terhadap `kamee-api` asli. Skor Performa adalah median 3 run (1 Oktober 2026, setelah penyempurnaan mobile/PWA). Kolom "sebelum" adalah build sebelumnya yang diukur di mesin dan sesi yang sama sebagai pembanding:

| Halaman | Performa | Sebelum | LCP | TBT | CLS | A11y | BP | SEO |
|---|---|---|---|---|---|---|---|---|
| `/` | 85 | 77–84 | 3,4 s | 320 ms | 0 | 100 | 100 | 100 |
| `/menu` | 87 | 79–89 | 3,6 s | 210 ms | 0 | 100 | 100 | 100 |
| `/menu/kopi-susu-aren` (menu lama) | 77 (74–92) | 73–83 | 4,2 s | 380 ms | 0 | 100 | 100 | 100 |
| `/promo` | 92 | 95 | 3,2 s | 130 ms | 0 | 100 | 100 | 100 |
| `/blog` | 88 | 80–91 | 3,5 s | 180 ms | 0 | 100 | 100 | 100 |
| `/kontak` | 89 | 89 | 3,0 s | 300 ms | 0 | 100 | 100 | 100 |
| `/masuk` | 95 | 92–96 | 2,4 s | 190 ms | 0 | 100 | 100 | 66¹ |
| `/pesanan` | 90 | 92 | 3,2 s | 200 ms | 0 | 100 | 100 | 100 |
| `/keranjang` | 82 | 70–73 | 4,0 s | 250 ms | **0** (sebelumnya 0,196) | 100 | 100 | 66¹ |
| `/checkout` | 81 | 69–70 | 4,0 s | 370 ms | **0** (sebelumnya 0,173) | 100 | 100 | 66¹ |

¹ Halaman ini sengaja `noindex` (keranjang, checkout, login), jadi audit "is-crawlable" gagal by design.

Bacaan hasil:

- **Pagu ≥ 90 belum tercapai di semua halaman pada mesin uji ini.** Mesinnya 2 core dan juga menjalankan Laravel, MySQL, dan Redis. Pada hari yang sama, build lama pun hanya mendapat 70–96, sementara sehari sebelumnya build lama mendapat sekitar 90 di halaman utama. Variasi antar run ±10 poin (contoh `/menu/kopi-susu-aren`: 74, 77, 92).
- **Waktu blok utama:** hidrasi React di CPU yang di-throttle 4×.
- **Dibanding build lama** di kondisi yang sama: CLS hilang total (keranjang dan checkout), login naik, dan halaman lain setara dalam batas noise.
- **Perlu diukur ulang** di infrastruktur produksi (server terpisah, CDN gambar).
- **Regresi yang ditemukan & diperbaiki selama audit:**
  - **Reload otomatis di kunjungan pertama.** Service worker memicu `controllerchange` pada kunjungan pertama, lalu halaman dimuat ulang. Sekarang reload hanya terjadi setelah pengguna menyetujui pembaruan.
  - **Modul toast di bundle awal.** Modul toast ikut masuk bundle awal; sekarang dimuat saat dibutuhkan.
  - **Login tidak lagi statis.** Form login sempat menjadi dinamis; sekarang statis kembali dan form ikut ada di HTML awal.

Catatan pengukuran:

- **Jangan ukur dalam mode mock.** Service worker MSW ikut terhitung dan menurunkan skor.
- **Panaskan cache optimizer gambar** dengan satu kunjungan sebelum mengukur.

### Tes

```bash
npm test                         # 21 tes unit: harga, opsi varian, merge baris, store (undo, catatan, persist)
E2E_OFFLINE=1 npm run test:e2e   # 47 tes: alur toko + admin (Pixel 7 + Desktop) dan 9 tes UX ponsel × 3 perangkat
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

Tes UX ponsel (`tests/e2e/mobile-ux.spec.ts`, proyek `iphone-14`, `pixel-7`, `galaxy-a`):

- **Tata letak:** tidak ada scroll horizontal, dan semua target sentuh ≥ 44 px di 10 halaman.
- **Navigasi:** tab bar 4 item, sembunyi saat keyboard terbuka dan di checkout.
- **Bottom sheet:**
  - sheet varian: swipe pendek kembali ke posisi semula, swipe panjang menutup;
  - filter & urutan menu lewat bottom sheet.
- **Checkout:** ringkasan bisa dilipat, tombol bayar tetap di layar saat menggulir, input `tel`/`autocomplete`/≥ 16 px.
- **Pembayaran:** tombol Simpan QR dan deeplink e-wallet.
- **Riwayat pesanan:** tarik untuk memuat ulang (sentuhan disimulasikan lewat CDP).
- **PWA:**
  - ajakan pasang: prompt browser di Android, panduan Bagikan di iOS;
  - manifest, ikon, screenshot, splash, `offline.html`, dan header `sw.js`.

Untuk menguji server yang sudah berjalan: `E2E_BASE_URL=http://localhost:3000 npm run test:e2e`.

---

## Yang perlu diganti / belum dicakup

- **Gambar placeholder.** Semua gambar di `public/hero`, `public/images/**`, `public/icons` dibuat oleh skrip (ilustrasi datar). Ganti dengan foto asli dengan nama file yang sama. Gambar produk dari API mengikuti `image_url` di database.
- **Data kontak.** Nomor WhatsApp, akun sosial, dan email ada di `.env`. Koordinat outlet diambil dari API.
- **Realtime sisi pelanggan.** Dashboard admin sudah memakai Reverb, tetapi halaman bayar & lacak pesanan pelanggan masih polling (3 dtk / 15 dtk). Channel `order.{code}` sudah tersedia di backend bila ingin disambungkan.
- **Turnstile.** Form kontak menampilkan Cloudflare Turnstile hanya jika `NEXT_PUBLIC_TURNSTILE_SITE_KEY` diisi.
