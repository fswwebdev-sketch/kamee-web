# Kamee API ☕

REST API untuk **Kamee Coffee** (`/api/v1`): katalog, pesanan (web, WhatsApp, POS), pembayaran QRIS statis dengan konfirmasi admin (Midtrans opsional), poin loyalitas, promo, konten, dan dashboard admin. Satu kontrak API yang sama dipakai web Next.js, dashboard admin, dan kelak aplikasi mobile/POS.

**Stack:** Laravel 12 · PHP 8.3 · MySQL 8 · Redis (cache, queue, lock) · Sanctum · Reverb · Pest · spatie/laravel-query-builder · Scribe · OpenSpout (XLSX)

---

## Daftar isi

1. [Instalasi dengan Docker](#1-instalasi-dengan-docker)
2. [Instalasi manual](#2-instalasi-manual)
3. [Akun & data demo](#3-akun--data-demo)
4. [Dokumentasi API](#4-dokumentasi-api)
5. [Arsitektur](#5-arsitektur)
6. [Aturan bisnis](#6-aturan-bisnis)
7. [Pembayaran (Midtrans & simulator)](#7-pembayaran)
8. [WhatsApp, realtime, dan scheduler](#8-whatsapp-realtime-dan-scheduler)
9. [Pengujian](#9-pengujian)
10. [Skema database](#10-skema-database)
11. [Catatan & keputusan desain](#11-catatan--keputusan-desain)

---

## 1. Instalasi dengan Docker

Membutuhkan Docker + Docker Compose. Layanan: `app` (php artisan serve), `queue`, `scheduler`, `reverb`, `mysql`, `redis`.

```bash
cp .env.example .env
# Default PAYMENT_GATEWAY=manual (QRIS statis + konfirmasi admin) — tidak butuh akun Midtrans

docker compose build
docker compose run --rm app composer install
docker compose run --rm app php artisan key:generate
docker compose up -d
docker compose exec app php artisan migrate --seed
docker compose exec app php artisan storage:link
docker compose exec app php artisan scribe:generate   # opsional: perbarui /docs
```

- API: http://localhost:8000/api/v1
- Dokumentasi: http://localhost:8000/docs
- Reverb (WebSocket): ws://localhost:8080

## 2. Instalasi manual

Prasyarat: PHP 8.3 (ekstensi `pdo_mysql`, `redis`, `intl`, `zip`, `bcmath`, `pcntl`, `gd`), Composer 2, MySQL 8, Redis 7.

```bash
composer install
cp .env.example .env
php artisan key:generate

# Buat database, lalu sesuaikan DB_* dan REDIS_* di .env
mysql -uroot -e "CREATE DATABASE kamee CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"

php artisan migrate --seed
php artisan storage:link
```

Jalankan proses berikut di terminal terpisah (atau `composer dev` bila `npx concurrently` tersedia):

```bash
php artisan serve                 # HTTP API
php artisan queue:work redis      # notifikasi WA & broadcast
php artisan reverb:start          # WebSocket realtime
php artisan schedule:work         # auto-cancel, rekonsiliasi, expire poin
```

Di produksi, ganti `schedule:work` dengan cron `* * * * * php artisan schedule:run` dan jalankan queue/reverb lewat Supervisor.

## 3. Akun & data demo

`php artisan migrate --seed` membuat:

| Data | Isi |
|---|---|
| Outlet | Satu outlet: **Kamee Coffee Taman Cibodas** (`kamee-taman-cibodas`, id 1), Jl. Cempaka Raya Blok I6 No. 3, Perumahan Taman Cibodas, Periuk, Kota Tangerang · buka 10:00–17:00 · radius antar 5 km · WA 6281280871630 |
| Admin | **Super Admin** `superadmin@kamee.id` / `password` · **Admin Outlet** (Taman Cibodas) `admin.cibodas@kamee.id` / `password` |
| Katalog | Menu asli: 3 kategori (Based Coffee, Manual Brew, Non Coffee), 19 produk, 8 grup opsi (beberapa grup "Ukuran" Cup / Bottle 250 ml / Bottle 1 L dengan selisih harga berbeda per menu, Penyajian, Proses Biji). ID kategori/grup/produk tetap sesuai spesifikasi bersama kamee-web. Rating, ulasan, dan terjual mulai dari 0; kalori & komposisi kosong. Mont Blanc & Cold Brew hanya akhir pekan (tertulis di deskripsi). |
| Promo | `KAMEEHEMAT` (20% maks Rp15.000, min Rp40.000), `GRATISONGKIR`, `BELI1GRATIS1`, `NGOPI10K` |
| Pelanggan | 20 pelanggan + alamat, tier Bronze/Silver/Gold |
| Pesanan | 100 pesanan acak 60 hari terakhir, dibuat lewat service yang sama dengan API (harga, promo, poin, log status, pembayaran QRIS manual / tunai). Tidak ada ulasan produk palsu |
| Konten | 3 banner, 6 artikel blog, 3 pesan kontak |

Login pelanggan memakai OTP WhatsApp. Dengan `WHATSAPP_DRIVER=log`, kode OTP tertulis di `storage/logs/laravel.log`.

## 4. Dokumentasi API

- **HTML (Scribe):** `GET /docs`
- **OpenAPI 3:** `GET /docs.openapi` (sumber: `storage/app/private/scribe/openapi.yaml`)
- **Postman:** `GET /docs.postman`
- Regenerasi setelah mengubah endpoint: `composer docs` (atau `php artisan scribe:generate`)

### Konvensi

- Sukses: `{ "data": ..., "meta": { "page", "per_page", "total", "last_page" } }`
- Error: `{ "message": "...", "errors": { "field": ["..."] } }` dengan kode 400/401/403/404/422/429/502. Semua pesan berbahasa Indonesia.
- Paginasi `?page=&per_page=` (maks 50), filter `?filter[category]=coffee`, urutan `?sort=-price`, relasi `?include=images,options`.
- Harga integer rupiah; waktu ISO 8601 zona Asia/Jakarta.
- Header **`Idempotency-Key` wajib** untuk `POST /orders`, `POST /orders/whatsapp`, `POST /orders/{code}/pay`.
- Autentikasi Bearer token Sanctum. Token pelanggan (ability `customer`) dari OTP, token admin (ability `admin`) dari login email/password.

### Contoh alur checkout

```bash
# 1. Simulasi harga keranjang (opsional)
curl -X POST localhost:8000/api/v1/orders/quote -H 'Content-Type: application/json' -d @order.json

# 2. Buat pesanan
curl -X POST localhost:8000/api/v1/orders \
  -H 'Content-Type: application/json' -H 'Idempotency-Key: 7c0e...' -d @order.json

# 3. Bayar — metode aktif diatur KAMEE_PAYMENT_METHODS (default: qris | cash)
curl -X POST localhost:8000/api/v1/orders/KM260928ABCDE/pay \
  -H 'Content-Type: application/json' -H 'Idempotency-Key: 9a1b...' -d '{"method":"qris"}'

# 4. Polling status tiap 3–5 detik sampai payment_deadline (default 60 menit)
curl localhost:8000/api/v1/orders/KM260928ABCDE/payment-status
```

`order.json` mengikuti contoh spesifikasi:

```json
{
  "outlet_id": 1,
  "customer": { "name": "Dinda", "phone": "6281234567890" },
  "fulfillment": "delivery",
  "address": { "text": "Jl. Cempaka Raya 10", "lat": -6.185, "lng": 106.600, "note": "Pagar hitam" },
  "items": [ { "product_id": 5, "qty": 2, "option_ids": [10], "note": "less ice" } ],
  "payment_method": "qris",
  "promo_code": "KAMEEHEMAT",
  "redeem_points": 0,
  "note": "Tolong sedotan kertas"
}
```

## 5. Arsitektur

```
Request → FormRequest (validasi + authorize via Policy)
        → Controller (tipis: panggil service, kembalikan Resource)
        → Service / Action (seluruh logika bisnis, transaksi DB, lock)
        → Model (Eloquent, enum cast, global scope)
        → API Resource (bentuk JSON)
```

| Folder | Isi |
|---|---|
| `app/Enums` | Enum PHP: `OrderStatus` (beserta transisi), `PaymentMethod`, `PaymentStatus`, `PromotionType`, `FulfillmentType`, `OrderChannel`, `LoyaltyTransactionType`, `UserRole`, dll. |
| `app/Services` | `PricingService`, `OrderService`, `OrderStateMachine`, `PromotionService`, `LoyaltyService`, `DeliveryFeeService`, `PaymentService`, `OtpService`, `DashboardService`, `ReportService`, `SettingService`, … |
| `app/Services/Payments` | Interface `PaymentGateway`, `ManualQrisGateway` (QRIS statis, default), `MidtransGateway`, `FakeGateway` (simulator lokal), `PaymentGatewayManager` |
| `app/Services/WhatsApp` | Interface `WhatsAppService`; driver `LogWhatsApp`, `FonnteWhatsApp`, `ArrayWhatsApp` (tes); template pesan `OrderMessages` |
| `app/Actions` | `CancelUnpaidOrders` (scheduler) |
| `app/Policies` | Otorisasi per model; Admin Outlet dibatasi `outlet_id` |
| `app/Models/Scopes/OutletScope` | Global scope: query `Order` otomatis difilter ke outlet Admin Outlet |
| `app/Http/Middleware` | `EnsureIdempotency`, `EnsureCustomer`, `EnsureAdmin`, `ForceJsonResponse` |

## 6. Aturan bisnis

### Harga (PricingService)
Semua harga dihitung ulang di server; nilai harga dari klien diabaikan.
1. Harga satuan = `base_price` + Σ `price_delta` opsi. Opsi harus milik grup opsi produk; grup `single` maksimal satu pilihan; grup wajib harus dipilih.
2. Produk nonaktif atau ditandai habis di outlet ditolak.
3. Ongkir (hanya `delivery`) → biaya layanan → diskon promo → potongan poin → total (tidak pernah negatif).

### Ongkir (DeliveryFeeService)
Jarak Haversine dari koordinat outlet. Tarif default: Rp8.000 untuk ≤ 2 km, lalu Rp2.500/km (dibulatkan ke atas). Di luar `delivery_radius_km` outlet ditolak (422). Tarif diatur Super Admin lewat `PUT /admin/settings`.

### Promo (PromotionService)
- Tipe: `percent` (dibatasi `max_discount`), `fixed`, `bogo` (setiap cangkir ke-2 produk yang sama gratis), `free_delivery`.
- Validasi: periode aktif, outlet, `min_spend`, `quota`, `per_customer_limit` (member via `customer_id`, tamu via nomor WA).
- Promo tanpa kode = promo otomatis (dipilih diskon terbesar). Kuota dikunci (`lockForUpdate`) saat pesanan dibuat dan dikembalikan saat pesanan dibatalkan.

### Poin loyalitas (LoyaltyService)
- **Tier:** Bronze (0), Silver (≥ Rp1 jt, ×1,25), Gold (≥ Rp5 jt, ×1,5), berdasarkan total belanja.
- **Earn:** saat pesanan **selesai**; 1 poin per Rp10.000 (tanpa ongkir & biaya layanan) × multiplier tier. Idempoten per pesanan. Berlaku 12 bulan.
- **Redeem:** khusus member login; 1 poin = Rp100; minimal 10 poin; maksimal 50% nilai belanja. Poin dikembalikan jika pesanan batal.
- **Expire FIFO:** pemakaian poin selalu mengurangi poin tertua lebih dulu; perintah harian mengedaluwarsakan sisa poin yang lewat masa berlaku.
- `orders.points_redeemed` menyimpan **jumlah poin**; nilai rupiahnya tersedia sebagai `points_discount` di respons.

### Status pesanan (OrderStateMachine)

```
pending ──► paid ──► processing ──► shipped ──► completed      (antar)
   │                     └────────────────────► completed      (pickup / dine-in)
   ├──(tunai)──► processing
   └──► cancelled ◄── processing (tunai)
paid / processing / shipped ──(refund, Super Admin)──► cancelled
```

Setiap transisi: divalidasi, dicatat di `order_status_logs` (siapa & catatan), disiarkan ke channel `outlet.{id}` dan `order.{code}`, dan pelanggan dikirimi WhatsApp. Selesai → tunai dilunasi, `sold_count` bertambah, poin diberikan. Batal → tagihan pending kedaluwarsa, kuota promo & poin dikembalikan.

### Idempotensi & rate limit
- `Idempotency-Key` disimpan 24 jam di Redis per pengguna + endpoint. Permintaan ulang dengan isi sama mengembalikan respons pertama (`Idempotent-Replayed: true`); isi berbeda → 422; permintaan paralel → 409.
- Rate limit: publik 60/menit per IP · OTP 3×/10 menit per nomor (+10×/10 menit per IP) · verifikasi OTP 10×/10 menit · cek voucher & quote 10/menit · login admin 5/menit · kontak 5/10 menit.

## 7. Pembayaran

Gateway dipilih lewat `PAYMENT_GATEWAY` (default **`manual`**). Metode yang boleh dipakai pelanggan diatur `KAMEE_PAYMENT_METHODS`
(default `qris,cash`). Metode lain ditolak **422** pada field `payment_method` (`"Metode pembayaran tidak tersedia."`), baik di
`POST /orders` (field opsional `payment_method`) maupun `POST /orders/{code}/pay` (field `method`, alias `payment_method`).

| Variabel | Default | Keterangan |
|---|---|---|
| `PAYMENT_GATEWAY` | `manual` | `manual` · `midtrans` · `fake` |
| `KAMEE_PAYMENT_METHODS` | `qris,cash` | Dipisah koma: `qris`, `ewallet`, `bank_transfer`, `cash` |
| `KAMEE_QRIS_IMAGE_URL` | — | URL gambar QRIS statis yang ditampilkan ke pelanggan (mis. `${FRONTEND_URL}/payments/qris-kameecoffee.jpg`) |
| `KAMEE_QRIS_MERCHANT` | `KAMEECOFFEE` | Nama merchant di QRIS |
| `KAMEE_QRIS_NMID` | `ID1026594722880` | NMID QRIS |
| `KAMEE_PAYMENT_TIMEOUT` | `60` | Batas bayar (menit) sejak pesanan dibuat; bisa ditimpa Super Admin (`payment_timeout_minutes`) |

### QRIS statis + konfirmasi manual (`PAYMENT_GATEWAY=manual`, default)

1. Pelanggan membuat pesanan lalu `POST /orders/{code}/pay` dengan `{"method":"qris"}`. Tidak ada panggilan ke penyedia luar;
   respons berisi gambar QRIS statis GoPay Merchant:

   ```json
   { "data": { "id": 12, "method": "qris", "provider": "manual", "reference": "KM260928ABCDE-1", "amount": 85000,
       "status": "pending", "qr_string": null, "va_number": null, "deeplink": null, "expires_at": "2026-09-28T11:00:00+07:00",
       "qris_image_url": "https://kamee.id/payments/qris-kameecoffee.jpg", "merchant_name": "KAMEECOFFEE",
       "nmid": "ID1026594722880", "requires_manual_confirmation": true, "...": "..." },
     "message": "Pindai QRIS dan bayar sesuai total pesanan. Admin akan mengonfirmasi pembayaran Anda.", "order_status": "pending" }
   ```

   Pelanggan memindai QR dan memasukkan nominal sesuai `amount`. Frontend mem-polling `GET /orders/{code}/payment-status`.
2. Admin memeriksa mutasi GoPay Merchant, lalu mengonfirmasi:

   ```bash
   curl -X POST localhost:8000/api/v1/admin/orders/42/confirm-payment \
     -H 'Authorization: Bearer <token admin>' -H 'Content-Type: application/json' -d '{"note":"Mutasi GoPay ref 8841"}'
   ```

   - Hanya untuk pesanan **pending** (selain itu 422 `errors.order`: "Pesanan tidak dalam status menunggu pembayaran.").
   - Tagihan QRIS manual terakhir (pending/kedaluwarsa) ditandai `paid`, `paid_at` diisi, dan `raw_payload` ditambah
     `confirmed_by {id, name}`, `confirmed_at`, `note`. Bila belum ada tagihan, dibuatkan otomatis sebesar total pesanan.
   - Pesanan `pending → paid` lewat state machine (log status "Pembayaran QRIS dikonfirmasi oleh {nama admin}", siaran realtime, WhatsApp pelanggan).
   - Otorisasi sama dengan ubah status: Admin Outlet hanya untuk outletnya (pesanan outlet lain 404), Super Admin semua outlet; tanpa token 401.
   - Respons: `AdminOrderResource` (sama seperti `PATCH /admin/orders/{order}/status`) + `message`.
3. Pesanan yang tidak dikonfirmasi dalam `payment_timeout_minutes` (default 60) dibatalkan otomatis oleh `orders:cancel-unpaid`.

Field tambahan `PaymentResource` (publik & admin): `qris_image_url`, `merchant_name`, `nmid` (null bila bukan gateway manual) dan
`requires_manual_confirmation` (`true` bila provider `manual` dan status `pending`). QRIS manual tidak punya webhook
(`/webhooks/payments/manual` → 404) dan dilewati `payments:reconcile`. Refund pesanan QRIS manual hanya dicatat di log;
pengembalian dana dilakukan manual di luar sistem.

### Midtrans (Core API)
Tetap tersedia. Isi `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION`, `PAYMENT_GATEWAY=midtrans`, dan aktifkan metode yang diinginkan, mis. `KAMEE_PAYMENT_METHODS=qris,ewallet,bank_transfer,cash`.

| Metode | Payload | Respons |
|---|---|---|
| `qris` | `payment_type: qris` | `qr_string` |
| `ewallet` + `channel` `gopay`/`shopeepay` | `gopay` / `shopeepay` | `deeplink` |
| `bank_transfer` + `channel` `bca`/`bni`/`bri`/`cimb`/`permata` | `bank_transfer` / `permata` | `va_number` |
| `cash` | — (tanpa gateway) | pesanan langsung `processing` |

Tagihan berlaku sampai batas waktu bayar (default 60 menit) sejak pesanan dibuat. Tagihan pending yang masih berlaku dengan metode sama dipakai ulang.

**Webhook:** atur *Payment Notification URL* di dashboard Midtrans ke
`https://<domain>/api/v1/webhooks/payments/midtrans`.
Signature diverifikasi (`SHA512(order_id + status_code + gross_amount + server_key)`), nominal dicocokkan, dan pemrosesan idempoten (lock Redis + status final tidak mundur). Pembayaran yang masuk setelah pesanan dibatalkan otomatis tetap dicatat dan dilog untuk refund manual.

### Simulator lokal (`PAYMENT_GATEWAY=fake`)
Tanpa koneksi ke Midtrans. Tandai pembayaran lunas:

```bash
BODY='{"reference":"KM260928ABCDE-1","status":"paid","amount":85000}'
SIG=$(php artisan tinker --execute="echo app(App\Services\Payments\FakeGateway::class)->sign('$BODY');")
curl -X POST localhost:8000/api/v1/webhooks/payments/fake \
  -H 'Content-Type: application/json' -H "X-Signature: $SIG" -d "$BODY"
```

## 8. WhatsApp, realtime, dan scheduler

**WhatsApp** (`WHATSAPP_DRIVER`): `log` (default, tulis ke log) atau `fonnte` (isi `FONNTE_TOKEN`). Dikirim lewat queue: OTP, konfirmasi pesanan, perubahan status. `POST /orders/whatsapp` menyimpan pesanan pending dan mengembalikan tautan `wa.me` berisi ringkasan pesanan ke nomor outlet.

**Realtime** (Reverb): event `order.created` dan `order.status_updated` di channel privat `outlet.{id}` (Super Admin / Admin Outlet pemilik) dan `order.{code}` (pelanggan pemilik pesanan / admin outlet). Otorisasi: `POST /api/v1/broadcasting/auth` dengan Bearer token.

```js
// Laravel Echo
window.Echo.private(`outlet.${outletId}`).listen('.order.created', (e) => { /* ... */ });
window.Echo.private(`order.${code}`).listen('.order.status_updated', (e) => { /* ... */ });
```

**Scheduler** (`routes/console.php`):

| Perintah | Jadwal | Fungsi |
|---|---|---|
| `orders:cancel-unpaid` | tiap menit | Batalkan pesanan non-tunai belum dibayar > `payment_timeout_minutes` (default 60 menit; status gateway dicek ulang dulu) |
| `payments:reconcile` | tiap 5 menit | Cocokkan pembayaran pending dengan status gateway (QRIS manual dilewati) |
| `loyalty:expire-points` | 00:15 setiap hari | Kedaluwarsakan poin (FIFO) |

## 9. Pengujian

```bash
composer test            # atau: php artisan test
composer test:coverage   # butuh pcov/xdebug; gagal bila coverage < 80%
```

Tes berjalan di SQLite in-memory (lihat `phpunit.xml`; gateway `manual`, metode `qris,cash`, dan batas bayar 60 menit dipatok di sana agar tidak bergantung pada `.env` lokal — tes Midtrans mengatur config-nya sendiri) dan juga lulus di MySQL 8:

```bash
DB_CONNECTION=mysql DB_DATABASE=kamee_test DB_USERNAME=... DB_PASSWORD=... php artisan test
```

**Hasil saat ini: 204 tes, semuanya lulus. Coverage `app/Services` + `app/Actions`: 98,7%.**

Cakupan tes: pricing & opsi, ongkir Haversine, voucher (semua tipe, kuota, batas per pelanggan), loyalitas (earn, tier, redeem, refund, expire FIFO), seluruh transisi state machine, QRIS manual (tagihan statis, metode nonaktif ditolak, konfirmasi admin & otorisasinya, batal otomatis 60 menit), Midtrans (charge QRIS/e-wallet/VA, refund, status), seeder (1 outlet, 19 produk, 3 kategori), webhook (signature, idempoten, nominal, status final), scheduler, idempotency & rate limit, serta otorisasi role (Super Admin vs Admin Outlet, pelanggan vs admin, channel broadcast).

## 10. Skema database

28 tabel domain (+ tabel bawaan Laravel: `sessions`, `password_reset_tokens`, `cache`, `jobs`, `personal_access_tokens`).

24 tabel sesuai spesifikasi: `users`, `outlets`, `categories`, `products`, `product_images`, `option_groups`, `options`, `customers`, `customer_addresses`, `orders`, `order_items`, `order_item_options`, `payments`, `order_status_logs`, `promotions`, `promotion_usages`, `loyalty_tiers`, `loyalty_transactions`, `favorites`, `reviews`, `banners`, `blog_categories`, `blogs`, `contacts`.

4 tabel tambahan yang dibutuhkan endpoint:

| Tabel | Alasan |
|---|---|
| `product_option_group` | Pivot produk ↔ grup opsi (Ukuran/Gula/Es/Topping per produk) |
| `outlet_product` | Ketersediaan produk per outlet (`PATCH /admin/outlets/{id}/products/{pid}`) |
| `settings` | Pengaturan ongkir, biaya, rasio poin, nomor WA (`GET/PUT /admin/settings`) |
| `otp_codes` | Kode OTP login pelanggan (di-hash, masa berlaku, jumlah percobaan) |

## 11. Catatan & keputusan desain

- **Tamu vs member:** pesanan tamu dengan nomor WA yang sudah terdaftar otomatis dikaitkan ke pelanggan tersebut (agar mendapat poin), tetapi penukaran poin hanya untuk member yang login.
- **Kode pesanan:** `KM` + `yymmdd` + 5 karakter acak tanpa huruf/angka ambigu, contoh `KM260928AB3CD`.
- **Pelacakan tamu:** `GET /orders/{code}?phone=` memerlukan 4 digit terakhir nomor WA. Channel `order.{code}` privat sehingga butuh token pelanggan; tamu memakai polling `payment-status`.
- **Upload file** (gambar produk, banner, cover blog, foto ulasan) memakai disk `public`. Untuk `PATCH` dengan file gunakan `POST` + `_method=PATCH` (multipart).
- **Laporan:**
  - `GET /admin/reports/sales` → ringkasan teragregasi `group_by=day|month|product|outlet|payment_method`.
  - `GET /admin/reports/sales.xlsx` → ekspor XLSX di-stream dengan OpenSpout (hemat memori). Tanpa `group_by` = semua transaksi; dengan `group_by` = ringkasan.
- **Tambahan untuk dashboard admin kamee-web:**
  - **Produk.** `POST /admin/products/bulk` (`activate|deactivate|feature|unfeature|best_seller|unbest_seller|delete`) dan `PUT /admin/products/{id}/images/order` (urutan galeri). Respons produk admin memakai `AdminProductResource`, yang berisi `option_group_ids` dan `unavailable_outlet_ids`.
  - **Rate limit.** Rute `/admin/*` memakai limiter `admin` sendiri: 300 req/menit per akun, bisa diatur lewat `KAMEE_ADMIN_RATE_LIMIT`. Tidak lagi memakai limiter publik 60/menit.
  - **Detail pelanggan.** `recent_orders` menyertakan outlet, dan `stats.last_order_at` dikirim dalam format ISO 8601.
  - **Batas unggah.** `docker/php/php.ini` memakai `post_max_size=32M`, supaya galeri 8 × 3 MB muat dalam satu unggahan.
- **Belum diimplementasikan:** 2FA admin (disebut opsional di spesifikasi, perlu kolom tambahan di `users`) dan driver Xendit (arsitektur `PaymentGateway` sudah siap; cukup tambah kelas driver dan daftarkan di `PaymentGatewayManager`).
