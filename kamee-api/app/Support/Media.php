<?php

namespace App\Support;

use Illuminate\Contracts\Filesystem\Filesystem;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use RuntimeException;

/**
 * Berkas gambar unggahan (produk, galeri, banner, blog, ulasan).
 *
 * Disk ditentukan config filesystems.media_disk: `public` (lokal, default) atau `supabase`
 * (Supabase Storage via S3) di Vercel. Path relatif disimpan di database; URL publik dibentuk saat
 * serialisasi sehingga mengganti disk/domain tidak perlu migrasi data. Nilai yang sudah berupa URL
 * absolut (mis. gambar seeder) dikembalikan apa adanya.
 */
final class Media
{
    public static function diskName(): string
    {
        return (string) config('filesystems.media_disk', 'public');
    }

    public static function disk(): Filesystem
    {
        return Storage::disk(self::diskName());
    }

    /** Simpan unggahan ke folder $directory dan kembalikan path relatifnya. */
    public static function store(UploadedFile $file, string $directory): string
    {
        $path = $file->store($directory, self::diskName());

        if (! is_string($path) || $path === '') {
            throw new RuntimeException('Gagal menyimpan berkas unggahan.');
        }

        return $path;
    }

    public static function delete(?string $path): void
    {
        if (blank($path) || self::isAbsolute($path)) {
            return;
        }

        self::disk()->delete($path);
    }

    public static function url(?string $path): ?string
    {
        if (blank($path)) {
            return null;
        }

        return self::isAbsolute($path) ? $path : self::disk()->url($path);
    }

    private static function isAbsolute(string $path): bool
    {
        // "/images/..." = aset statis milik situs web (gambar menu bawaan) → dipakai apa adanya.
        return str_starts_with($path, 'http://') || str_starts_with($path, 'https://') || str_starts_with($path, '/');
    }
}
