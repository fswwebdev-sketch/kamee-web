# Kamee API ☕

REST API untuk **Kamee Coffee** (`/api/v1`): katalog, pesanan (web, WhatsApp, POS), pembayaran Midtrans, poin loyalitas, promo, konten, dan dashboard admin. Satu kontrak API yang sama dipakai web Next.js, dashboard admin, dan kelak aplikasi mobile/POS.

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
# Untuk mencoba tanpa akun Midtrans, set PAYMENT_GATEWAY=fake di .env

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
| Outlet | Kamee Coffee Cikokol, Kamee Coffee Karawaci (Tangerang) |
| Admin | **Super Admin** `superadmin@kamee.id` / `password` · **Admin Outlet** (Cikokol) `admin.cikokol@kamee.id` / `password` |
| Katalog | 6 kategori (Coffee, Non Coffee, Signature Drink, Tea Series, Snack, Dessert), 30 produk, grup opsi Ukuran/Gula/Es/Topping |
| Promo | `KAMEEHEMAT` (20% maks Rp15.000, min Rp40.000), `GRATISONGKIR`, `BELI1GRATIS1`, `NGOPI10K` |
| Pelanggan | 20 pelanggan + alamat, tier Bronze/Silver/Gold |
| Pesanan | 100 pesanan acak 60 hari terakhir, dibuat lewat service yang sama dengan API (harga, promo, poin, log status, pembayaran, ulasan) |
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

# 3. Bayar (qris | ewallet + channel gopay/shopeepay | bank_transfer + channel bca/bni/bri/cimb/permata | cash)
curl -X POST localhost:8000/api/v1/orders/KM260928ABCDE/pay \
  -H 'Content-Type: application/json' -H 'Idempotency-Key: 9a1b...' -d '{"method":"qris"}'

# 4. Polling status tiap 3 detik (maks 15 menit)
curl localhost:8000/api/v1/orders/KM260928ABCDE/payment-status
```

`order.json` mengikuti contoh spesifikasi:

```json
{
  "outlet_id": 1,
  "customer": { "name": "Dinda", "phone": "6281234567890" },
  "fulfillment": "delivery",
  "address": { "text": "Jl. Merdeka 10", "lat": -6.200, "lng": 106.630, "note": "Pagar hitam" },
  "items": [ { "product_id": 5, "qty": 2, "option_ids": [2, 4, 7, 10], "note": "less ice" } ],
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
| `app/Services/Payments` | Interface `PaymentGateway`, `MidtransGateway`, `FakeGateway` (simulator lokal), `PaymentGatewayManager` |
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

### Midtrans (Core API)
Isi `MIDTRANS_SERVER_KEY`, `MIDTRANS_CLIENT_KEY`, `MIDTRANS_IS_PRODUCTION`, dan `PAYMENT_GATEWAY=midtrans`.

| Metode | Payload | Respons |
|---|---|---|
| `qris` | `payment_type: qris` | `qr_string` |
| `ewallet` + `channel` `gopay`/`shopeepay` | `gopay` / `shopeepay` | `deeplink` |
| `bank_transfer` + `channel` `bca`/`bni`/`bri`/`cimb`/`permata` | `bank_transfer` / `permata` | `va_number` |
| `cash` | — (tanpa gateway) | pesanan langsung `processing` |

Tagihan berlaku sampai batas 15 menit sejak pesanan dibuat. Tagihan pending yang masih berlaku dengan metode sama dipakai ulang.

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
| `orders:cancel-unpaid` | tiap menit | Batalkan pesanan non-tunai belum dibayar > 15 menit (status gateway dicek ulang dulu) |
| `payments:reconcile` | tiap 5 menit | Cocokkan pembayaran pending dengan status gateway |
| `loyalty:expire-points` | 00:15 setiap hari | Kedaluwarsakan poin (FIFO) |

## 9. Pengujian

```bash
composer test            # atau: php artisan test
composer test:coverage   # butuh pcov/xdebug; gagal bila coverage < 80%
```

Tes berjalan di SQLite in-memory (lihat `phpunit.xml`) dan juga lulus di MySQL 8:

```bash
DB_CONNECTION=mysql DB_DATABASE=kamee_test DB_USERNAME=... DB_PASSWORD=... php artisan test
```

**Hasil saat ini: 190 tes, 904 assertion, semuanya lulus. Coverage `app/Services` + `app/Actions`: 98,7%.**

Cakupan tes: pricing & opsi, ongkir Haversine, voucher (semua tipe, kuota, batas per pelanggan), loyalitas (earn, tier, redeem, refund, expire FIFO), seluruh transisi state machine, Midtrans (charge QRIS/e-wallet/VA, refund, status), webhook (signature, idempoten, nominal, status final), scheduler, idempotency & rate limit, serta otorisasi role (Super Admin vs Admin Outlet, pelanggan vs admin, channel broadcast).

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
