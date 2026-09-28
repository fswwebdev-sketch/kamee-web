<?php

namespace App\Services;

use App\Exceptions\BusinessException;
use App\Jobs\SendWhatsAppMessage;
use App\Models\Customer;
use App\Models\LoyaltyTier;
use App\Models\OtpCode;
use App\Services\WhatsApp\OrderMessages;
use App\Support\Phone;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

/**
 * Login pelanggan tanpa kata sandi: OTP 6 digit dikirim via WhatsApp.
 */
class OtpService
{
    public function __construct(private readonly OrderMessages $messages) {}

    public function request(string $phone): array
    {
        $phone = Phone::normalize($phone);
        $ttl = (int) config('kamee.otp.ttl_minutes');
        $code = $this->generateCode();

        DB::transaction(function () use ($phone, $code, $ttl) {
            OtpCode::query()->where('phone_wa', $phone)->whereNull('used_at')->update(['used_at' => now()]);
            OtpCode::create([
                'phone_wa' => $phone,
                'code_hash' => Hash::make($code),
                'expires_at' => now()->addMinutes($ttl),
            ]);
        });

        SendWhatsAppMessage::dispatch($phone, $this->messages->otp($code, $ttl));

        return ['phone' => Phone::mask($phone), 'expires_in' => $ttl * 60];
    }

    /**
     * Verifikasi OTP. Pelanggan baru dibuat otomatis pada login pertama.
     *
     * @return array{customer: Customer, token: string, is_new: bool}
     */
    public function verify(string $phone, string $code, ?string $name = null): array
    {
        $phone = Phone::normalize($phone);

        $otp = OtpCode::query()->where('phone_wa', $phone)->whereNull('used_at')->latest('id')->first();

        if ($otp === null || $otp->expires_at->isPast()) {
            throw BusinessException::field('code', 'Kode OTP sudah kedaluwarsa. Silakan minta kode baru.');
        }

        if ($otp->attempts >= (int) config('kamee.otp.max_attempts')) {
            throw BusinessException::field('code', 'Terlalu banyak percobaan. Silakan minta kode baru.');
        }

        if (! Hash::check($code, $otp->code_hash)) {
            $otp->increment('attempts');
            throw BusinessException::field('code', 'Kode OTP salah.');
        }

        $otp->update(['used_at' => now()]);

        $customer = Customer::query()->where('phone_wa', $phone)->first();
        $isNew = $customer === null;

        if ($isNew) {
            $customer = Customer::create([
                'name' => $name ?: 'Sahabat Kamee',
                'phone_wa' => $phone,
                'tier_id' => LoyaltyTier::query()->orderBy('min_spend')->value('id'),
            ])->refresh();
        }

        $token = $customer->createToken('customer', ['customer'])->plainTextToken;

        return ['customer' => $customer->load('tier'), 'token' => $token, 'is_new' => $isNew];
    }

    private function generateCode(): string
    {
        $length = (int) config('kamee.otp.length');

        return str_pad((string) random_int(0, 10 ** $length - 1), $length, '0', STR_PAD_LEFT);
    }
}
