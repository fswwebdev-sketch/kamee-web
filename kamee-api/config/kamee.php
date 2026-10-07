<?php

/*
|--------------------------------------------------------------------------
| Konfigurasi bisnis Kamee Coffee
|--------------------------------------------------------------------------
| Nilai di sini adalah default. Super Admin dapat menimpanya lewat
| PUT /api/v1/admin/settings (disimpan di tabel settings, di-cache).
*/

return [
    // Hari tutup (0 = Minggu … 6 = Sabtu, pisahkan koma). Kamee buka Senin–Sabtu.
    'closed_days' => array_values(array_map('intval', array_filter(explode(',', (string) env('KAMEE_CLOSED_DAYS', '0')), 'is_numeric'))),
    'open_days_label' => env('KAMEE_OPEN_DAYS_LABEL', 'Senin–Sabtu'),

    // Batas request panel admin per akun per menit
    'admin_rate_limit' => (int) env('KAMEE_ADMIN_RATE_LIMIT', 300),

    'settings' => [
        // Pesanan & pembayaran
        'payment_timeout_minutes' => (int) env('KAMEE_PAYMENT_TIMEOUT', 60),
        'service_fee' => (int) env('KAMEE_SERVICE_FEE', 0),

        // Ongkir: tarif dasar untuk jarak <= delivery_base_km, lalu per km berikutnya (dibulatkan ke atas)
        'delivery_base_fee' => 8000,
        'delivery_base_km' => 2,
        'delivery_per_km_fee' => 2500,

        // Poin loyalitas
        'points_earn_per_amount' => 10000, // 1 poin setiap belanja Rp10.000
        'point_value' => 100,              // 1 poin = Rp100 saat ditukar
        'points_max_redeem_percent' => 50, // maks 50% dari nilai belanja
        'points_min_redeem' => 10,
        'points_expiry_months' => 12,

        // Kontak & jam buka default outlet baru
        'whatsapp_number' => env('KAMEE_WHATSAPP_NUMBER', '6281280871630'),
        'default_open_time' => '10:00',
        'default_close_time' => '17:00',
    ],

    'otp' => [
        'length' => 6,
        'ttl_minutes' => 5,
        'max_attempts' => 5,
        'max_requests' => 3,        // per nomor
        'decay_minutes' => 10,      // dalam 10 menit
    ],

    'idempotency_ttl_hours' => 24,

    // Seeder data demo (pelanggan contoh, pesanan demo, pesan kontak contoh). Matikan untuk produksi:
    // KAMEE_SEED_DEMO=false → db:seed hanya mengisi data asli (outlet, admin, menu, promo, konten, pembukuan).
    'seed_demo' => filter_var(env('KAMEE_SEED_DEMO', true), FILTER_VALIDATE_BOOL),

    // Rahasia endpoint POST /api/v1/internal/cron (header X-Cron-Secret). Kosong = endpoint nonaktif.
    'cron_secret' => env('CRON_SECRET'),

    // Endpoint /internal/setup (migrasi + data awal). Matikan setelah database siap.
    'setup_enabled' => filter_var(env('KAMEE_SETUP_ENABLED', true), FILTER_VALIDATE_BOOL),

    // Email login Super Admin yang dibuat seeder (produksi: email pemilik).
    'admin_email' => env('KAMEE_ADMIN_EMAIL', 'superadmin@kamee.id'),

    // manual (QRIS statis + konfirmasi admin) | midtrans | fake (simulator lokal)
    'payment_gateway' => env('PAYMENT_GATEWAY', 'manual'),

    // Metode pembayaran yang diterima saat checkout: qris, ewallet, bank_transfer, cash
    'payment_methods' => array_values(array_filter(array_map('trim', explode(',', (string) env('KAMEE_PAYMENT_METHODS', 'qris,cash'))))),

    // QRIS statis (GoPay Merchant) untuk gateway manual; pembayaran dikonfirmasi admin.
    'manual_qris' => [
        'image_url' => env('KAMEE_QRIS_IMAGE_URL', null),
        'merchant_name' => env('KAMEE_QRIS_MERCHANT', 'KAMEECOFFEE'),
        'nmid' => env('KAMEE_QRIS_NMID', 'ID1026594722880'),
    ],

    'turnstile' => [
        'secret' => env('TURNSTILE_SECRET_KEY'),
        'verify_url' => 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    ],
];
