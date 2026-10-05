<?php

namespace App\Http\Requests\Customer;

use App\Rules\IndonesianPhone;
use Illuminate\Foundation\Http\FormRequest;

class VerifyOtpRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'phone' => ['required', new IndonesianPhone],
            'code' => ['required', 'digits:'.config('kamee.otp.length')],
            'name' => ['nullable', 'string', 'max:100'],
        ];
    }

    public function bodyParameters(): array
    {
        return [
            'phone' => ['example' => '081234567890'],
            'code' => ['description' => 'Kode OTP 6 digit dari WhatsApp.', 'example' => '123456'],
            'name' => ['description' => 'Nama (dipakai saat pendaftaran pertama).', 'example' => 'Dinda'],
        ];
    }
}
