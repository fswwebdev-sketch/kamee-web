<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/** Metode pembayaran harus termasuk config('kamee.payment_methods') (KAMEE_PAYMENT_METHODS). */
class EnabledPaymentMethod implements ValidationRule
{
    public const MESSAGE = 'Metode pembayaran tidak tersedia.';

    /** @return list<string> */
    public static function enabled(): array
    {
        return array_values((array) config('kamee.payment_methods', []));
    }

    public static function allows(mixed $value): bool
    {
        return is_string($value) && in_array($value, self::enabled(), true);
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! self::allows($value)) {
            $fail(self::MESSAGE);
        }
    }
}
