<?php

namespace App\Http\Requests\Public;

use Illuminate\Foundation\Http\FormRequest;

class ValidatePromotionRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'code' => ['required', 'string', 'max:50'],
            'subtotal' => ['required', 'integer', 'min:0'],
            'outlet_id' => ['nullable', 'integer', 'exists:outlets,id'],
            'delivery_fee' => ['nullable', 'integer', 'min:0'],
        ];
    }

    public function bodyParameters(): array
    {
        return [
            'code' => ['description' => 'Kode voucher.', 'example' => 'KAMEEHEMAT'],
            'subtotal' => ['description' => 'Subtotal keranjang (rupiah).', 'example' => 56000],
            'outlet_id' => ['description' => 'ID outlet.', 'example' => 1],
            'delivery_fee' => ['description' => 'Ongkir (untuk voucher gratis ongkir).', 'example' => 10500],
        ];
    }
}
