<?php

namespace App\Http\Requests\Public;

use App\Rules\IndonesianPhone;
use App\Rules\Turnstile;
use Illuminate\Foundation\Http\FormRequest;

class StoreContactRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'email', 'max:150'],
            'phone' => ['nullable', new IndonesianPhone],
            'subject' => ['required', 'string', 'max:150'],
            'message' => ['required', 'string', 'max:3000'],
            'turnstile_token' => [Turnstile::enabled() ? 'required' : 'nullable', 'string', new Turnstile],
        ];
    }

    public function attributes(): array
    {
        return ['turnstile_token' => 'captcha'];
    }

    public function bodyParameters(): array
    {
        return [
            'name' => ['example' => 'Dinda'],
            'email' => ['example' => 'dinda@example.com'],
            'phone' => ['example' => '081234567890'],
            'subject' => ['example' => 'Kerja sama event'],
            'message' => ['example' => 'Halo Kamee, kami ingin memesan 100 cup untuk acara kantor.'],
            'turnstile_token' => ['description' => 'Token Cloudflare Turnstile (wajib di produksi).', 'example' => 'XXXX.DUMMY.TOKEN'],
        ];
    }
}
