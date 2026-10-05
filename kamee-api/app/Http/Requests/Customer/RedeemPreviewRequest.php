<?php

namespace App\Http\Requests\Customer;

use Illuminate\Foundation\Http\FormRequest;

class RedeemPreviewRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'points' => ['required', 'integer', 'min:1'],
            'subtotal' => ['required', 'integer', 'min:0'],
        ];
    }

    public function bodyParameters(): array
    {
        return ['points' => ['example' => 50], 'subtotal' => ['example' => 56000]];
    }
}
