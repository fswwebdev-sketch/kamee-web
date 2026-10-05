<?php

namespace App\Support;

/** Angka desimal (stok/takaran) untuk JSON: bilangan bulat dikirim sebagai int, selain itu float. */
final class Qty
{
    public static function num(mixed $value, int $precision = 3): int|float|null
    {
        if ($value === null) {
            return null;
        }

        $rounded = round((float) $value, $precision);

        return floor($rounded) == $rounded && abs($rounded) < PHP_INT_MAX ? (int) $rounded : $rounded;
    }

    /** Format teks ringkas, mis. 22 / 1,5. */
    public static function text(mixed $value): string
    {
        $n = self::num($value);

        return is_int($n) ? (string) $n : rtrim(rtrim(number_format($n, 3, ',', ''), '0'), ',');
    }
}
