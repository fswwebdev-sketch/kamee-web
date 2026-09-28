<?php

namespace App\Rules;

use App\Support\Phone;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

class IndonesianPhone implements ValidationRule
{
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value) && ! is_int($value) || ! Phone::isValid((string) $value)) {
            $fail('Nomor WhatsApp tidak valid. Gunakan format 08xx atau 628xx.');
        }
    }
}
