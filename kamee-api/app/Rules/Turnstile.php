<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Support\Facades\Http;
use Throwable;

/** Verifikasi token Cloudflare Turnstile. Dilewati bila TURNSTILE_SECRET_KEY kosong (lokal). */
class Turnstile implements ValidationRule
{
    public static function enabled(): bool
    {
        return filled(config('kamee.turnstile.secret'));
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! self::enabled()) {
            return;
        }

        try {
            $response = Http::asForm()->timeout(10)->post(config('kamee.turnstile.verify_url'), [
                'secret' => config('kamee.turnstile.secret'),
                'response' => $value,
                'remoteip' => request()->ip(),
            ]);

            if (! $response->json('success')) {
                $fail('Verifikasi captcha gagal. Silakan coba lagi.');
            }
        } catch (Throwable) {
            $fail('Verifikasi captcha tidak dapat dilakukan. Silakan coba lagi.');
        }
    }
}
