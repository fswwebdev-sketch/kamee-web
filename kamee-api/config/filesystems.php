<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Filesystem Disk
    |--------------------------------------------------------------------------
    |
    | Here you may specify the default filesystem disk that should be used
    | by the framework. The "local" disk, as well as a variety of cloud
    | based disks are available to your application for file storage.
    |
    */

    'default' => env('FILESYSTEM_DISK', 'local'),

    /*
    |--------------------------------------------------------------------------
    | Disk Gambar Unggahan (produk, galeri, banner, blog, ulasan)
    |--------------------------------------------------------------------------
    |
    | MEDIA_DISK menentukan tujuan unggahan. Bila kosong, mengikuti FILESYSTEM_DISK
    | (kecuali `local` yang bersifat privat → memakai `public`). Di Vercel gunakan
    | `supabase` karena filesystem function bersifat read-only & sementara.
    |
    */

    'media_disk' => env('MEDIA_DISK', in_array(env('FILESYSTEM_DISK'), [null, '', 'local'], true) ? 'public' : env('FILESYSTEM_DISK')),

    /*
    |--------------------------------------------------------------------------
    | Filesystem Disks
    |--------------------------------------------------------------------------
    |
    | Below you may configure as many filesystem disks as necessary, and you
    | may even configure multiple disks for the same driver. Examples for
    | most supported storage drivers are configured here for reference.
    |
    | Supported drivers: "local", "ftp", "sftp", "s3"
    |
    */

    'disks' => [

        'local' => [
            'driver' => 'local',
            'root' => storage_path('app/private'),
            'serve' => true,
            'throw' => false,
            'report' => false,
        ],

        'public' => [
            'driver' => 'local',
            'root' => storage_path('app/public'),
            'url' => rtrim(env('APP_URL', 'http://localhost'), '/').'/storage',
            'visibility' => 'public',
            'throw' => false,
            'report' => false,
        ],

        // Supabase Storage (S3-compatible). Bucket harus PUBLIC agar URL gambar bisa diakses langsung.
        // Endpoint: https://<ref>.storage.supabase.co/storage/v1/s3
        // URL publik: https://<ref>.supabase.co/storage/v1/object/public/<bucket>
        'supabase' => [
            'driver' => 's3',
            'key' => env('SUPABASE_S3_KEY'),
            'secret' => env('SUPABASE_S3_SECRET'),
            'region' => env('SUPABASE_S3_REGION', 'ap-southeast-1'),
            'bucket' => env('SUPABASE_S3_BUCKET', 'kamee'),
            'endpoint' => env('SUPABASE_S3_ENDPOINT'),
            'url' => env('SUPABASE_PUBLIC_URL'),
            'use_path_style_endpoint' => true,
            // Supabase tidak memakai ACL objek: jangan kirim header visibility; akses publik diatur di bucket.
            'options' => ['CacheControl' => 'public, max-age=31536000, immutable'],
            // Checksum CRC32 default AWS SDK terbaru tidak diperlukan; kirim hanya bila diwajibkan operasi.
            'request_checksum_calculation' => 'when_required',
            'response_checksum_validation' => 'when_required',
            'throw' => true,
            'report' => false,
        ],

        's3' => [
            'driver' => 's3',
            'key' => env('AWS_ACCESS_KEY_ID'),
            'secret' => env('AWS_SECRET_ACCESS_KEY'),
            'region' => env('AWS_DEFAULT_REGION'),
            'bucket' => env('AWS_BUCKET'),
            'url' => env('AWS_URL'),
            'endpoint' => env('AWS_ENDPOINT'),
            'use_path_style_endpoint' => env('AWS_USE_PATH_STYLE_ENDPOINT', false),
            'throw' => false,
            'report' => false,
        ],

    ],

    /*
    |--------------------------------------------------------------------------
    | Symbolic Links
    |--------------------------------------------------------------------------
    |
    | Here you may configure the symbolic links that will be created when the
    | `storage:link` Artisan command is executed. The array keys should be
    | the locations of the links and the values should be their targets.
    |
    */

    'links' => [
        public_path('storage') => storage_path('app/public'),
    ],

];
