# Introduction

REST API Kamee Coffee (v1) untuk web Next.js, dashboard admin, dan aplikasi mobile/POS.

<aside>
    <strong>Base URL</strong>: <code>http://localhost:8000</code>
</aside>

    Semua endpoint berada di bawah `/api/v1`, menerima & mengembalikan JSON, dan seluruh pesan berbahasa Indonesia.

    **Konvensi**
    - Sukses: `{ "data": ..., "meta": { "page", "per_page", "total", "last_page" } }` (meta hanya untuk daftar berhalaman).
    - Error: `{ "message", "errors": { "field": ["..."] } }` dengan kode 400/401/403/404/422/429/502.
    - Paginasi `?page=&per_page=` (maks 50), filter `?filter[category]=coffee`, urutan `?sort=-price`, relasi `?include=images,options`.
    - Semua harga berupa integer rupiah; waktu ISO 8601 zona Asia/Jakarta.
    - Header `Idempotency-Key` **wajib** untuk `POST /orders`, `POST /orders/whatsapp`, dan `POST /orders/{code}/pay`.
    - Rate limit publik 60 permintaan/menit per IP; OTP 3×/10 menit per nomor; cek voucher 10×/menit.

    **Autentikasi** — Bearer token Sanctum:
    - Pelanggan: `POST /auth/otp/request` → `POST /auth/otp/verify` (token ber-ability `customer`).
    - Admin: `POST /admin/auth/login` (token ber-ability `admin`). Admin Outlet otomatis dibatasi ke outletnya.

    **Realtime** — Laravel Reverb, channel privat `outlet.{id}` dan `order.{code}`, event `order.created` & `order.status_updated`.
    Otorisasi channel: `POST /api/v1/broadcasting/auth` dengan Bearer token.

