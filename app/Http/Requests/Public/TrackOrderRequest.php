<?php

namespace App\Http\Requests\Public;

use Illuminate\Foundation\Http\FormRequest;

class TrackOrderRequest extends FormRequest
{
    public function rules(): array
    {
        return ['phone' => ['required', 'string', 'regex:/\d{4,}/']];
    }

    public function messages(): array
    {
        return ['phone.regex' => 'Masukkan minimal 4 digit terakhir nomor WhatsApp.'];
    }

    public function queryParameters(): array
    {
        return ['phone' => ['description' => '4 digit terakhir (atau nomor lengkap) WhatsApp pemesan.', 'example' => '7890']];
    }
}
