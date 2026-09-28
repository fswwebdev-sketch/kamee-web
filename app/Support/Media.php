<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;

final class Media
{
    public static function url(?string $path): ?string
    {
        if (blank($path)) {
            return null;
        }

        return str_starts_with($path, 'http') ? $path : Storage::disk('public')->url($path);
    }
}
