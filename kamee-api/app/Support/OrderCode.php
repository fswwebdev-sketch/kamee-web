<?php

namespace App\Support;

use App\Models\Order;
use Carbon\CarbonInterface;
use Illuminate\Support\Str;

/**
 * Kode pesanan yang mudah dibaca: KM + yymmdd + 5 karakter acak (tanpa huruf/angka ambigu).
 */
final class OrderCode
{
    private const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    public static function generate(?CarbonInterface $date = null): string
    {
        do {
            $random = '';
            for ($i = 0; $i < 5; $i++) {
                $random .= self::ALPHABET[random_int(0, strlen(self::ALPHABET) - 1)];
            }
            $code = 'KM'.($date ?? now())->format('ymd').$random;
        } while (Order::withoutGlobalScopes()->where('code', $code)->exists());

        return Str::upper($code);
    }
}
