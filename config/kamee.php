<?php

/*
|--------------------------------------------------------------------------
| Konfigurasi bisnis Kamee Coffee
|--------------------------------------------------------------------------
| Nilai di sini adalah default. Super Admin dapat menimpanya lewat
| PUT /api/v1/admin/settings (disimpan di tabel settings, di-cache).
*/

return [
    'settings' => [
        // Pesanan & pembayaran
        'payment_timeout_minutes' => (int) env('KAMEE_PAYMENT_TIMEOUT', 15),
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
        'whatsapp_number' => env('KAMEE_WHATSAPP_NUMBER', '6281200000000'),
        'default_open_time' => '07:00',
        'default_close_time' => '22:00',
    ],

    'otp' => [
        'length' => 6,
        'ttl_minutes' => 5,
        'max_attempts' => 5,
        'max_requests' => 3,        // per nomor
        'decay_minutes' => 10,      // dalam 10 menit
    ],

    'idempotency_ttl_hours' => 24,

    'payment_gateway' => env('PAYMENT_GATEWAY', 'midtrans'),

    'turnstile' => [
        'secret' => env('TURNSTILE_SECRET_KEY'),
        'verify_url' => 'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    ],
];
