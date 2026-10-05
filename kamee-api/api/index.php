<?php

/*
|--------------------------------------------------------------------------
| Entry point Vercel (runtime komunitas vercel-php)
|--------------------------------------------------------------------------
|
| vercel.json meneruskan semua request ke file ini; PHP built-in server menjalankannya sebagai router.
| Function serverless bersifat read-only kecuali /tmp, jadi storage & cache bootstrap Laravel dialihkan
| ke /tmp, dan default lingkungan serverless dipasang bila belum diatur di Environment Variables Vercel.
|
*/

$defaults = [
    // Cache bootstrap Laravel (bootstrap/cache tidak bisa ditulis di Vercel)
    'APP_CONFIG_CACHE' => '/tmp/config.php',
    'APP_EVENTS_CACHE' => '/tmp/events.php',
    'APP_PACKAGES_CACHE' => '/tmp/packages.php',
    'APP_ROUTES_CACHE' => '/tmp/routes.php',
    'APP_SERVICES_CACHE' => '/tmp/services.php',
    'VIEW_COMPILED_PATH' => '/tmp',
    'LARAVEL_STORAGE_PATH' => '/tmp/storage',
    // Tanpa proses latar: log ke stderr (Vercel Logs), cache & lock di database, antrean sinkron.
    'LOG_CHANNEL' => 'stderr',
    'SESSION_DRIVER' => 'array',
    'CACHE_STORE' => 'database',
    'QUEUE_CONNECTION' => 'sync',
    'BROADCAST_CONNECTION' => 'log',
    'TRUSTED_PROXIES' => '*',
];

foreach ($defaults as $key => $value) {
    $current = getenv($key);
    if ($current === false || $current === '') {
        putenv("{$key}={$value}");
        $current = $value;
    }
    $_ENV[$key] = $_SERVER[$key] = $current;
}

foreach (['app/public', 'framework/cache/data', 'framework/sessions', 'framework/views', 'logs'] as $dir) {
    $path = $_ENV['LARAVEL_STORAGE_PATH'].'/'.$dir;
    if (! is_dir($path)) {
        @mkdir($path, 0755, true);
    }
}

// Seolah-olah request masuk lewat public/index.php: tanpa ini Symfony menganggap "/api" sebagai
// base URL (karena skrip berada di /api/index.php) sehingga route /api/v1/... tidak cocok.
$_SERVER['SCRIPT_FILENAME'] = dirname(__DIR__).'/public/index.php';
$_SERVER['SCRIPT_NAME'] = '/index.php';
$_SERVER['PHP_SELF'] = '/index.php';

require dirname(__DIR__).'/public/index.php';
