<?php

/*
|--------------------------------------------------------------------------
| CORS (Cross-Origin Resource Sharing)
|--------------------------------------------------------------------------
|
| API memakai token Bearer (Sanctum), bukan cookie → supports_credentials = false.
| Origin yang diizinkan:
|   CORS_ALLOWED_ORIGINS  daftar dipisah koma, mis. "https://kameecoffee.id,https://www.kameecoffee.id"
|                         (bila kosong memakai FRONTEND_URL; bila keduanya kosong atau "*" → semua origin)
|   CORS_ALLOWED_ORIGIN_PATTERNS  regex dipisah koma, mis. "#^https://kamee-web-[a-z0-9-]+\.vercel\.app$#"
|                         untuk URL preview Vercel.
|
*/

$origins = array_values(array_filter(array_map(
    fn (string $origin) => rtrim(trim($origin), '/'),
    explode(',', (string) (env('CORS_ALLOWED_ORIGINS') ?: env('FRONTEND_URL', ''))),
)));

return [

    'paths' => ['api/*', 'up'],

    'allowed_methods' => ['*'],

    'allowed_origins' => $origins === [] || in_array('*', $origins, true) ? ['*'] : $origins,

    'allowed_origins_patterns' => array_values(array_filter(array_map('trim', explode(',', (string) env('CORS_ALLOWED_ORIGIN_PATTERNS', ''))))),

    'allowed_headers' => ['*'],

    // Header yang dibaca frontend: replay idempotensi, batas rate limit, nama berkas ekspor.
    'exposed_headers' => ['Idempotent-Replayed', 'Retry-After', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'Content-Disposition'],

    // Cache preflight 1 hari (mengurangi request OPTIONS → cold start di serverless).
    'max_age' => (int) env('CORS_MAX_AGE', 86400),

    'supports_credentials' => false,

];
