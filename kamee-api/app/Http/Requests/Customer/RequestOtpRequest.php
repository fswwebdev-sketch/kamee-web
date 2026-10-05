<?php

namespace App\Http\Requests\Customer;

use App\Rules\IndonesianPhone;
use Illuminate\Foundation\Http\FormRequest;

class RequestOtpRequest extends FormRequest
{
    public function rules(): array
    {
        return ['phone' => ['required', new IndonesianPhone]];
    }

    public function bodyParameters(): array
    {
        return ['phone' => ['description' => 'Nomor WhatsApp.', 'example' => '081234567890']];
    }
}
