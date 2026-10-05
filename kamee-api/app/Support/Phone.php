<?php

namespace App\Support;

/**
 * Normalisasi nomor WhatsApp Indonesia ke format 62xxxxxxxxxx.
 */
final class Phone
{
    public static function normalize(?string $phone): string
    {
        $digits = preg_replace('/\D/', '', (string) $phone);

        return match (true) {
            str_starts_with($digits, '62') => $digits,
            str_starts_with($digits, '0') => '62'.substr($digits, 1),
            str_starts_with($digits, '8') => '62'.$digits,
            default => $digits,
        };
    }

    public static function isValid(?string $phone): bool
    {
        return (bool) preg_match('/^628\d{7,12}$/', self::normalize($phone));
    }

    public static function mask(string $phone): string
    {
        return strlen($phone) > 7 ? substr($phone, 0, 5).str_repeat('*', strlen($phone) - 8).substr($phone, -3) : $phone;
    }
}
