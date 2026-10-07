# Kamee API ☕

REST API untuk **Kamee Coffee** (`/api/v1`): katalog, pesanan (web, WhatsApp, POS), pembayaran QRIS statis dengan konfirmasi admin (Midtrans opsional), poin loyalitas, promo, konten, dan dashboard admin. Satu kontrak API yang sama dipakai web Next.js, dashboard admin, dan kelak aplikasi mobile/POS.

**Stack:** Laravel 12 · PHP 8.3+ · MySQL 8 atau PostgreSQL 15–17 (Supabase) · Redis atau cache database · Sanctum · Reverb · Pest · spatie/laravel-query-builder · Scribe · OpenSpout (XLSX) · Supabase Storage (S3)

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
12. [Keuangan (pembukuan admin)](#12-keuangan-pembukuan-admin)
13. [Deploy: GitHub + Vercel + Supabase](#13-deploy-github--vercel--supabase)

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
| Katalog | Menu asli: 3 kategori (Based Coffee, Manual Brew, Non Coffee), 27 produk, 11 grup opsi (beberapa grup "Ukuran" Cup / Bottle 250 ml / Bottle 1 L dengan selisih harga berbeda per menu, Penyajian, Proses Biji). ID kategori/grup/produk tetap sesuai spesifikasi bersama kamee-web. Rating, ulasan, dan terjual mulai dari 0; kalori & komposisi kosong. Mont Blanc & Cold Brew hanya hari Sabtu (tertulis di deskripsi); outlet tutup hari Minggu (`KAMEE_CLOSED_DAYS`). |
| Promo | `KAMEEHEMAT` (20% maks Rp15.000, min Rp40.000), `GRATISONGKIR`, `BELI1GRATIS1`, `NGOPI10K` |
| Pelanggan | 20 pelanggan + alamat, tier Bronze/Silver/Gold |
| Pesanan | 100 pesanan acak 60 hari terakhir, dibuat lewat service yang sama dengan API (harga, promo, poin, log status, pembayaran QRIS manual / tunai). Tidak ada ulasan produk palsu |
| Konten | 3 banner, 6 artikel blog, 3 pesan kontak |
| Keuangan | `BookkeepingSeeder`: data buku catatan pemilik + ekspor Kasir Kamee (20 Sep–2 Okt 2026) — 11 bahan & kemasan, belanja stok 20/9 (Rp2.321.000) + es batu, pengeluaran lain, 12 pengeluaran & 34 penjualan dari Kasir, dan resep 27 menu. Lihat [§12](#12-keuangan-pembukuan-admin) |

Login pelanggan memakai OTP WhatsApp. Dengan `WHATSAPP_DRIVER=log`, kode OTP tertulis di `storage/logs/laravel.log`.

**Produksi tanpa data demo:** `KAMEE_SEED_DEMO=false php artisan db:seed` melewati pelanggan, pesanan demo, dan pesan kontak contoh (baris *Pelanggan*, *Pesanan*, dan pesan kontak di tabel atas). Data lain tetap diisi. Data inilah yang ada di `database/supabase/seed.sql`.

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

   Body opsional `method` (`qris` default | `bank_transfer` | `cash`) dan `bank` (mis. `"BCA"`, untuk transfer) mencatat cara
   pelanggan membayar; bank disimpan di `raw_payload.bank` dan tampil sebagai `payment.bank`.

   - Hanya untuk pesanan **pending** (selain itu 422 `errors.order`: "Pesanan tidak dalam status menunggu pembayaran.").
   - Tagihan QRIS manual terakhir (pending/kedaluwarsa) ditandai `paid`, `paid_at` diisi, dan `raw_payload` ditambah
     `confirmed_by {id, name}`, `confirmed_at`, `note`. Bila belum ada tagihan, dibuatkan otomatis sebesar total pesanan.
   - Pesanan `pending → paid` lewat state machine (log status "Pembayaran {QRIS | Transfer BCA | Tunai} dikonfirmasi oleh {nama admin}", siaran realtime, WhatsApp pelanggan).
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
| `kamee:prune-cache` | 03:00 setiap hari | Hapus baris kedaluwarsa di tabel `cache`/`cache_locks` (untuk `CACHE_STORE=database`) |

Di server biasa jalankan `php artisan schedule:work`. Di hosting tanpa proses latar (Vercel), panggil `POST /api/v1/internal/cron` (header `X-Cron-Secret`) setiap 5 menit, atau `php artisan kamee:cron`. Keduanya menjalankan tugas di atas secara sinkron: tugas menit-an/5-menit dijalankan setiap kali dipanggil, sedangkan tugas harian dijalankan sekali per hari pada panggilan pertama setelah jamnya. Lihat [§13](#13-deploy-github--vercel--supabase).

## 9. Pengujian

```bash
composer test            # atau: php artisan test
composer test:coverage   # butuh pcov/xdebug; gagal bila coverage < 80%
```

Tes berjalan di SQLite in-memory (lihat `phpunit.xml`; gateway `manual`, metode `qris,cash`, dan batas bayar 60 menit dipatok di sana agar tidak bergantung pada `.env` lokal — tes Midtrans mengatur config-nya sendiri) dan juga lulus di MySQL 8:

```bash
DB_CONNECTION=mysql DB_DATABASE=kamee_test DB_USERNAME=... DB_PASSWORD=... php artisan test
```

**PostgreSQL (sama dengan Supabase).** Variabel lingkungan dari shell menimpa nilai di `phpunit.xml`, jadi cukup:

```bash
# database kosong khusus tes (akan di-migrate ulang)
DB_CONNECTION=pgsql DB_HOST=127.0.0.1 DB_PORT=5432 DB_DATABASE=kamee_test DB_USERNAME=postgres DB_PASSWORD= \
CACHE_STORE=database php artisan test

# Meniru Supabase transaction pooler (PgBouncer pool_mode=transaction di depan Postgres):
DB_PORT=6432 DB_PGSQL_DISABLE_PREPARES=true ... php artisan test
```

Tidak punya Postgres lokal? Biner PostgreSQL 17 portabel tersedia lewat npm: `npm i @embedded-postgres/linux-x64@17.10.0-beta.17`. Lalu jalankan `initdb` dan `pg_ctl` dari `node_modules/@embedded-postgres/linux-x64/native/bin` (sebagai user non-root).

Catatan PostgreSQL: pencarian memakai `whereLike` (otomatis `ILIKE`, tidak membedakan huruf besar/kecil). Agregat `SUM`/`AVG` di-cast ke int/float. Pengelompokan tanggal memakai `to_char(created_at, ...)`: kolom `timestamp` disimpan tanpa zona waktu dalam `APP_TIMEZONE` (Asia/Jakarta), jadi tidak perlu `AT TIME ZONE` dan hasilnya tidak bergantung pada zona waktu server (Supabase = UTC). `Cache::lock` di store database memakai `INSERT … ON CONFLICT DO NOTHING`, jadi aman di dalam transaksi PostgreSQL. Seeder yang menulis ID tetap ikut memajukan sequence.

**Hasil saat ini: 231 tes, semuanya lulus di SQLite, MySQL 8, dan PostgreSQL 17 (langsung maupun lewat PgBouncer mode transaksi). Coverage `app/Services` + `app/Actions`: 98,1%.**

Cakupan tes: pricing & opsi, ongkir Haversine, voucher (semua tipe, kuota, batas per pelanggan), loyalitas (earn, tier, redeem, refund, expire FIFO), seluruh transisi state machine, QRIS manual (tagihan statis, metode nonaktif ditolak, konfirmasi admin & otorisasinya, batal otomatis 60 menit), Midtrans (charge QRIS/e-wallet/VA, refund, status), seeder (1 outlet, 27 produk, 3 kategori, total buku catatan & HPP Aren Kame), keuangan (bahan, stok opname, belanja stok, resep/HPP, kasir, pemotongan & pembalikan stok, buku kas, ringkasan, isolasi outlet), webhook (signature, idempoten, nominal, status final), scheduler, idempotency & rate limit, serta otorisasi role (Super Admin vs Admin Outlet, pelanggan vs admin, channel broadcast).

## 10. Skema database

35 tabel domain (+ tabel bawaan Laravel: `sessions`, `password_reset_tokens`, `cache`, `jobs`, `personal_access_tokens`).

24 tabel sesuai spesifikasi: `users`, `outlets`, `categories`, `products`, `product_images`, `option_groups`, `options`, `customers`, `customer_addresses`, `orders`, `order_items`, `order_item_options`, `payments`, `order_status_logs`, `promotions`, `promotion_usages`, `loyalty_tiers`, `loyalty_transactions`, `favorites`, `reviews`, `banners`, `blog_categories`, `blogs`, `contacts`.

11 tabel tambahan yang dibutuhkan endpoint (7 di antaranya untuk pembukuan, lihat §12):

| Tabel | Alasan |
|---|---|
| `product_option_group` | Pivot produk ↔ grup opsi (Ukuran/Gula/Es/Topping per produk) |
| `outlet_product` | Ketersediaan produk per outlet (`PATCH /admin/outlets/{id}/products/{pid}`) |
| `settings` | Pengaturan ongkir, biaya, rasio poin, nomor WA (`GET/PUT /admin/settings`) |
| `otp_codes` | Kode OTP login pelanggan (di-hash, masa berlaku, jumlah percobaan) |
| `ingredients`, `stock_movements` | Bahan & kemasan per outlet (soft delete) dan mutasi stoknya |
| `stock_purchases`, `stock_purchase_items` | Belanja stok |
| `recipes`, `recipe_items` | Resep per produk/outlet (`is_sample`, `note`) dan takaran per varian Ukuran |
| `cash_entries` | Buku kas pemasukan/pengeluaran |

## 11. Catatan & keputusan desain

- **Tamu vs member:** pesanan tamu dengan nomor WA yang sudah terdaftar otomatis dikaitkan ke pelanggan tersebut (agar mendapat poin), tetapi penukaran poin hanya untuk member yang login.
- **Kode pesanan:** `KM` + `yymmdd` + 5 karakter acak tanpa huruf/angka ambigu, contoh `KM260928AB3CD`.
- **Pelacakan tamu:** `GET /orders/{code}?phone=` memerlukan 4 digit terakhir nomor WA. Channel `order.{code}` privat sehingga butuh token pelanggan; tamu memakai polling `payment-status`.
- **Upload file** (gambar produk, banner, cover blog, foto ulasan) memakai disk `filesystems.media_disk`: default `public`, dan `supabase` (Supabase Storage via S3) di Vercel. Database menyimpan path relatif; URL publik dibentuk oleh `App\Support\Media`. Untuk `PATCH` dengan file gunakan `POST` + `_method=PATCH` (multipart).
- **Laporan:**
  - `GET /admin/reports/sales` → ringkasan teragregasi `group_by=day|month|product|outlet|payment_method`.
  - `GET /admin/reports/sales.xlsx` → ekspor XLSX di-stream dengan OpenSpout (hemat memori). Tanpa `group_by` = semua transaksi; dengan `group_by` = ringkasan.
- **Tambahan untuk dashboard admin kamee-web:**
  - **Produk.** `POST /admin/products/bulk` (`activate|deactivate|feature|unfeature|best_seller|unbest_seller|delete`) dan `PUT /admin/products/{id}/images/order` (urutan galeri). Respons produk admin memakai `AdminProductResource`, yang berisi `option_group_ids` dan `unavailable_outlet_ids`.
  - **Rate limit.** Rute `/admin/*` memakai limiter `admin` sendiri: 300 req/menit per akun, bisa diatur lewat `KAMEE_ADMIN_RATE_LIMIT`. Tidak lagi memakai limiter publik 60/menit.
  - **Detail pelanggan.** `recent_orders` menyertakan outlet, dan `stats.last_order_at` dikirim dalam format ISO 8601.
  - **Batas unggah.** `docker/php/php.ini` memakai `post_max_size=32M`, supaya galeri 8 × 3 MB muat dalam satu unggahan.
- **Belum diimplementasikan:** 2FA admin (disebut opsional di spesifikasi, perlu kolom tambahan di `users`) dan driver Xendit (arsitektur `PaymentGateway` sudah siap; cukup tambah kelas driver dan daftarkan di `PaymentGatewayManager`).

## 12. Keuangan (pembukuan admin)

Semua endpoint di `/api/v1/admin` (Sanctum admin). **Super Admin dan Admin Outlet sama-sama boleh** memakai seluruh fitur ini.
Data dibatasi outlet: Admin Outlet selalu outletnya sendiri (data outlet lain 404, `outlet_id` di body/query diabaikan);
Super Admin melihat semua outlet atau memfilter dengan `?outlet_id=`, dan data baru/resep tanpa `outlet_id` masuk ke outlet pertama.
Uang = integer rupiah, takaran/stok = desimal (3 angka), tanggal `YYYY-MM-DD`, zona waktu Asia/Jakarta.

| Endpoint | Keterangan |
|---|---|
| `GET ingredients?kind=&q=` | Bahan & kemasan (tanpa paginasi, maks. 500): `cost_per_unit` = `pack_price / pack_size` (2 desimal), `stock_qty`, `low_stock` |
| `POST ingredients` · `GET/PUT/DELETE ingredients/{id}` | `opening_stock` (hanya POST) → mutasi `opening`. Hapus = soft delete + baris resep yang memakainya ikut dihapus |
| `GET ingredients/{id}/movements` | Mutasi stok (paginasi): `opening`, `purchase`, `sale`, `sale_reversal`, `adjustment` |
| `POST ingredients/{id}/adjust` | Stok opname `{counted_qty, note?}` → mutasi `adjustment` sebesar selisih |
| `GET/POST stock-purchases` · `GET/DELETE stock-purchases/{id}` | Belanja stok: mutasi `purchase` (packs × pack_size), `pack_price` bahan diperbarui, pengeluaran kas otomatis (`source=stock_purchase`, kategori `kemasan` bila semua item kemasan, selain itu `bahan_baku`). Hapus = mutasi & entri kas ikut dihapus |
| `GET recipes` · `GET/PUT recipes/{product_id}` | Resep per varian Ukuran + HPP, margin, `cups_possible`, `limiting_ingredient`. PUT mengganti seluruh resep (`is_sample` default false, `note` opsional) |
| `GET/POST cash-entries` · `GET/PUT/DELETE cash-entries/{id}` | Buku kas; filter `from,to,type,method,category,q`; `summary {income, expense, balance}` untuk seluruh filter. Entri dari belanja stok → 422 "Ubah lewat menu Belanja stok." |
| `POST orders/pos` | Kasir: harga dihitung server (dasar + opsi, opsi wajib divalidasi; tanpa promo/poin/ongkir), channel `pos`, status langsung `completed` (log pending → paid → completed), pembayaran `paid` provider `pos`. Respons `{data, message, change}`; `cash_received` < total → 422 |
| `POST orders/{id}/confirm-payment` | Kini menerima `method` & `bank` (lihat §7) |
| `GET finance/summary?from&to` | Ringkasan (default bulan berjalan): penjualan per metode & channel, pemasukan lain, HPP, laba kotor, pengeluaran, arus kas, menu terlaris, harian, `missing_recipes` |

**Pemotongan stok otomatis** (`StockService`, dipanggil `OrderStateMachine` di dalam transaksi transisi):
- Saat pesanan pertama kali masuk status terbayar/berjalan (`paid`, `processing` — termasuk tunai `pending → processing` —, `shipped`, `completed`; pesanan kasir) → tiap item dicari varian resepnya: opsi item `"Ukuran: Cup"` dicocokkan (tanpa membedakan huruf besar/kecil) dengan `option_name` resep; bila tidak ada → varian `option_name = null`; produk tanpa resep dilewati. Dibuat mutasi `sale` = −(qty item × takaran), `reference` = kode pesanan. Idempoten lewat `orders.stock_deducted_at`.
- Pesanan yang sudah dipotong lalu dibatalkan/refund → mutasi `sale_reversal` sebesar mutasi `sale` yang tercatat, sekali (`orders.stock_reversed_at`).
- Stok boleh minus; penjualan tidak pernah ditolak karena stok.
- Resep yang dibuat belakangan tidak memotong stok pesanan lama secara mundur.

**HPP:** biaya baris = takaran × `cost_per_unit` (harga kemasan terbaru ÷ isi kemasan); HPP varian = Σ biaya baris dibulatkan ke rupiah;
margin = harga (harga dasar + selisih opsi Ukuran) − HPP; `margin_pct` 1 desimal. `cups_possible` = min ⌊stok ÷ takaran⌋ (stok ≤ 0 → 0).
Di ringkasan, `hpp_total` = Σ qty terjual × HPP varian **resep saat ini** (item tanpa resep = 0 dan namanya masuk `missing_recipes`);
`net_profit_estimate` = laba kotor + pemasukan lain (selain `modal`) − pengeluaran operasional (selain `bahan_baku` & `kemasan`).
Penjualan di buku kas (kategori `penjualan`) tidak punya rincian menu sehingga tidak masuk `products`/HPP.

**Asumsi resep:** takaran kopi ditulis dalam gram biji — espresso diekstraksi 1:2, sehingga **40 ml espresso ≈ 20 gram kopi**.
Es batu (±100 gr per cup) tidak dihitung di HPP karena belanjanya tidak tercatat per gram; dicatat sebagai pengeluaran kas.

**Data awal (`BookkeepingSeeder`)** berasal dari buku catatan pemilik periode **20–29 Sep 2026** dan dijalankan setelah `DemoOrderSeeder`
(pesanan demo tidak memotong stok). Idempoten; `created_by` = Super Admin.
- 11 bahan & kemasan (harga nota 20/9/2026). Stok awal = satu belanja stok 2026-09-20 "Belanja 10 hari pertama" (9 item, **Rp2.321.000**) yang dibuat lewat `StockPurchaseService` (mutasi + entri kas), ditambah pengeluaran **Es batu Rp25.000**. Matcha & Botol 250 ml belum punya stok/harga.
- Pengeluaran lain Rp388.150 (tanggal & metode tidak tertulis → 2026-09-20, tunai, diberi catatan) dan 13 pemasukan penjualan Rp1.111.000 (transfer BCA/BJB & tunai; baris yang bacaan tulisan tangannya ragu diberi catatan "mohon cek").
- **Resep Aren Kame adalah resep asli pemilik (`is_sample = false`)** — Cup: aren 30, creamer 20, susu 120, kopi 20, cup 1 → HPP Rp12.580, margin Rp5.420 (30,1%), cukup 110 cup (dibatasi stok Cup 12 oz + tutup). Resep menu lain adalah **contoh perkiraan (`is_sample = true`)** yang akan diubah pemilik.
- Pengeluaran pribadi pemilik (kaos kaki, pilates) sengaja tidak dicatat.

## 13. Deploy: GitHub + Vercel + Supabase

> **Penyiapan database tanpa SQL Editor:** setelah deploy pertama, buka sekali
> `https://api.<domain>/api/v1/internal/setup?key=<CRON_SECRET>` — endpoint ini menjalankan migrasi dan
> mengisi data awal (tanpa demo; Super Admin = `KAMEE_ADMIN_EMAIL`, sandi `password`). Idempoten.
> Setelah berhasil, set `KAMEE_SETUP_ENABLED=false` dan redeploy. Alternatifnya tetap bisa menempel
> `database/supabase/schema.sql` + `seed.sql` di SQL Editor.

Panduan ini untuk pemilik usaha, tidak perlu menjadi developer. Hasil akhirnya: API berjalan di `https://api.<domain-anda>` (Vercel, gratis/Hobby), dengan database dan penyimpanan gambar di Supabase.

**Gambaran singkat**

| Bagian | Layanan | Catatan |
|---|---|---|
| Kode | GitHub (repo `kamee-api`) | Setiap *push* ke branch utama otomatis di-deploy ulang oleh Vercel |
| API PHP | Vercel, runtime komunitas `vercel-php@0.9.0` (PHP 8.4) | `api/index.php` + `vercel.json`, region `sin1` (Singapura) |
| Database | Supabase Postgres 17, lewat Transaction pooler port 6543 | `database/supabase/schema.sql` + `seed.sql` |
| Gambar | Supabase Storage, bucket publik `kamee` (API S3) | Disk `supabase` |
| Jadwal (batal otomatis, poin, dll.) | Supabase `pg_cron` + `pg_net` → `POST /api/v1/internal/cron` tiap 5 menit | Vercel Cron Hobby hanya harian (sudah dipasang sebagai cadangan) |

### Langkah 1 — Buat project Supabase

1. Masuk ke <https://supabase.com> → **New project**. Nama: `kamee`, Region: **Southeast Asia (Singapore)**. Buat **Database Password** yang kuat dan simpan.
2. Tunggu sampai project siap (±2 menit).

### Langkah 2 — Buat tabel & data awal

1. Supabase → **SQL Editor** → **New query**.
2. Buka `database/supabase/schema.sql` di GitHub (tombol *Raw*), salin semua isinya, tempel, lalu klik **Run**. Pesan yang muncul harus *Success*.
3. Ulangi dengan `database/supabase/seed.sql`.
   (Bisa juga minta asisten/developer menjalankannya: `psql "<connection string>" -f database/supabase/schema.sql -f database/supabase/seed.sql`.)

Isi `seed.sql`: outlet Taman Cibodas, 2 akun admin, 27 menu dan opsinya, promo, banner, blog, tier loyalitas, dan pembukuan awal. Data demo (pelanggan, pesanan, pesan contoh) tidak ikut. Seluruh tabel dikunci dengan RLS, dan akses role `anon`/`authenticated` dicabut, sehingga data tidak bisa dibaca lewat Supabase Data API. Laravel tetap bisa mengaksesnya karena memakai role `postgres`.

> Banner dan artikel contoh memakai gambar placeholder dan tanggal saat file dibuat. Ganti lewat dashboard admin.

### Langkah 3 — Bucket gambar (Supabase Storage)

1. Supabase → **Storage** → **New bucket** → nama `kamee`, aktifkan **Public bucket** → Save.
2. Storage → **Settings** (bagian *S3 Connection*): pastikan S3 aktif, catat **Endpoint** dan **Region**.
3. Di halaman yang sama → **New access key** → catat **Access key ID** dan **Secret access key** (secret hanya tampil sekali).
4. URL publik bucket: `https://<project-ref>.supabase.co/storage/v1/object/public/kamee`. `<project-ref>` adalah kode 20 huruf di URL dashboard Supabase.

### Langkah 4 — Data koneksi database

Supabase → tombol **Connect** (atas) → **Transaction pooler**. Catat *host* (mis. `aws-0-ap-southeast-1.pooler.supabase.com`), *port* `6543`, *database* `postgres`, dan *user* `postgres.<project-ref>`. Password = Database Password dari langkah 1.

> Kenapa pooler? Alamat langsung `db.<ref>.supabase.co` hanya IPv6, sedangkan Vercel butuh IPv4. Mode transaksi (6543) paling cocok untuk serverless. Wajib isi `DB_PGSQL_DISABLE_PREPARES=true`, karena mode ini tidak mendukung *prepared statement* bernama. Sudah diuji dengan PgBouncer `pool_mode=transaction`. Alternatif: Session pooler (port 5432 di host yang sama) dengan `DB_PGSQL_DISABLE_PREPARES=false`, tetapi jumlah koneksinya lebih terbatas.

### Langkah 5 — Import repo ke Vercel

1. Masuk ke <https://vercel.com> dengan akun GitHub → **Add New… → Project** → pilih repo **kamee-api** → **Import**.
2. Framework Preset: **Other**. Build/Output command dibiarkan kosong (`vercel.json` sudah mengatur semuanya).
3. Buka **Environment Variables** dan isi semua variabel dari `.env.vercel.example`. Yang wajib diganti:

| Variabel | Isi |
|---|---|
| `APP_KEY` | Kunci acak `base64:...`, dibuat dengan `php artisan key:generate --show` (minta asisten). Jangan diganti setelah live |
| `APP_URL` | `https://api.<domain>` (sementara boleh URL `*.vercel.app`) |
| `FRONTEND_URL`, `CORS_ALLOWED_ORIGINS` | Domain web, mis. `https://kameecoffee.id,https://www.kameecoffee.id` |
| `DB_HOST`, `DB_PORT=6543`, `DB_DATABASE=postgres`, `DB_USERNAME`, `DB_PASSWORD`, `DB_SSLMODE=require`, `DB_PGSQL_DISABLE_PREPARES=true` | Dari langkah 4 |
| `CRON_SECRET` | String acak panjang (mis. `openssl rand -hex 32`) |
| `FILESYSTEM_DISK=supabase`, `SUPABASE_S3_ENDPOINT`, `SUPABASE_S3_REGION`, `SUPABASE_S3_KEY`, `SUPABASE_S3_SECRET`, `SUPABASE_S3_BUCKET=kamee`, `SUPABASE_PUBLIC_URL` | Dari langkah 3 |
| `PAYMENT_GATEWAY=manual`, `KAMEE_PAYMENT_METHODS=qris,cash`, `KAMEE_QRIS_IMAGE_URL` | Pembayaran QRIS statis |
| `KAMEE_SEED_DEMO=false` | Produksi tanpa data demo |

4. Klik **Deploy**. Setelah selesai, cek `https://<project>.vercel.app/up` (harus 200) dan `https://<project>.vercel.app/api/v1/categories` (harus berisi 3 kategori).

Yang sudah diatur otomatis oleh `vercel.json` + `api/index.php`: semua request diarahkan ke Laravel, cache bootstrap/view/storage dipindah ke `/tmp` (filesystem lain read-only), `LOG_CHANNEL=stderr` (log ada di Vercel → Logs), `SESSION_DRIVER=array` (API memakai token Bearer Sanctum, bukan cookie), `CACHE_STORE=database` (rate limit, idempotensi, dan kunci memakai tabel `cache`/`cache_locks`), `QUEUE_CONNECTION=sync`, `BROADCAST_CONNECTION=log`, dan `TRUSTED_PROXIES=*` (IP klien & https terbaca benar di belakang proxy Vercel). Folder `tests`, `docs`, `storage`, dan file SQL tidak ikut dibundel (`excludeFiles`). Composer memasang dependensi tanpa paket dev, dan skrip `composer vercel` membuang layanan AWS SDK selain S3 agar bundel kecil.

### Langkah 6 — Domain `api.<domain>`

1. Vercel → Project → **Settings → Domains** → tambahkan `api.kameecoffee.id`.
2. Di pengelola DNS domain, buat record **CNAME** `api` → `cname.vercel-dns.com` (ikuti nilai yang ditampilkan Vercel). Tunggu sampai statusnya *Valid*.
3. Ubah `APP_URL` ke `https://api.kameecoffee.id`, lalu **Redeploy**.
4. Di project web (kamee-web), set `NEXT_PUBLIC_API_URL=https://api.kameecoffee.id/api/v1` dan `NEXT_PUBLIC_API_MOCKING=disabled`.

### Langkah 7 — Jadwal otomatis tiap 5 menit (pg_cron)

Pesanan QRIS yang tidak dibayar dalam 60 menit dibatalkan oleh tugas terjadwal. Karena Vercel tidak punya proses latar, Supabase yang memanggil API setiap 5 menit:

1. Supabase → **Database → Extensions**: aktifkan **pg_cron** dan **pg_net**.
2. SQL Editor → jalankan (ganti domain dan rahasia sesuai `CRON_SECRET`):

```sql
select cron.schedule(
  'kamee-cron',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://api.kameecoffee.id/api/v1/internal/cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Accept', 'application/json',
      'X-Cron-Secret', 'ISI_SAMA_DENGAN_CRON_SECRET'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  );
  $$
);
```

Cek hasilnya beberapa menit kemudian:

```sql
select status, return_message, start_time from cron.job_run_details order by start_time desc limit 5;
select status_code, content from net._http_response order by created desc limit 5;  -- harus 200 + ringkasan JSON
```

Mengubah/menghapus jadwal: `select cron.unschedule('kamee-cron');` lalu jalankan ulang `cron.schedule` di atas.

Respons endpoint berisi ringkasan, mis. `{"data":{"status":"ok","tasks":{"orders:cancel-unpaid":{"status":"ok","output":"0 pesanan dibatalkan otomatis."}, ...}}}`. Tanpa rahasia yang benar → 401. Bila panggilan sebelumnya masih berjalan → 409.

> **Vercel Cron** (paket Hobby) hanya bisa harian. `vercel.json` sudah memasang satu jadwal harian 17:15 UTC (00:15 WIB) ke endpoint yang sama sebagai cadangan. Vercel otomatis mengirim `Authorization: Bearer <CRON_SECRET>`. Jadwal tiap 5 menit tetap memakai pg_cron. Alternatif lain: layanan cron eksternal (mis. cron-job.org) dengan header `X-Cron-Secret`.

### Langkah 8 — Ganti sandi admin (WAJIB)

Akun awal `superadmin@kamee.id` dan `admin.cibodas@kamee.id` memakai sandi **`password`**. Segera ganti: masuk ke dashboard admin → **Pengguna** → ubah sandi kedua akun (atau buat akun baru lalu nonaktifkan akun bawaan).

### Perawatan

- **Migrasi baru:** jalankan `database/supabase/build.sh` di komputer developer (butuh PostgreSQL lokal) untuk membuat ulang `schema.sql`/`seed.sql`. Untuk database Supabase yang sudah berisi data, jalankan `php artisan migrate --force` dari komputer developer dengan env `DB_*` mengarah ke Supabase (pakai Session pooler port 5432). Jangan jalankan `schema.sql` lagi. Tabel baru di Supabase perlu `alter table public.<tabel> enable row level security;`.
- **Batasan di Vercel:**
  - Realtime Reverb tidak aktif (`BROADCAST_CONNECTION=log`); web memakai polling.
  - Antrean `sync`, jadi pesan WhatsApp (bila `WHATSAPP_DRIVER=fonnte`) dikirim di dalam request dan sedikit memperlambat respons.
  - *Cold start* ±1–2 detik setelah lama tidak ada request.
  - Body request maksimal ±4,5 MB, jadi unggah gambar galeri sedikit demi sedikit (maks 4 MB per file, lihat `api/php.ini`).
  - Durasi maksimal request 30 detik (`maxDuration`).
  - Batal otomatis bisa terlambat hingga 5 menit (cron 5 menit, bukan per menit).
- **Build gagal karena batas rate GitHub saat `composer install`:** tambahkan env `COMPOSER_AUTH` = `{"github-oauth":{"github.com":"<token GitHub read-only>"}}` di Vercel.
