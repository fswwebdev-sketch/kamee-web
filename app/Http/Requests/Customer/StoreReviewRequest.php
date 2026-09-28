<?php

namespace App\Http\Requests\Customer;

use Illuminate\Foundation\Http\FormRequest;

class StoreReviewRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'order_code' => ['required', 'string', 'max:20'],
            'product_id' => ['required', 'integer'],
            'rating' => ['required', 'integer', 'between:1,5'],
            'comment' => ['nullable', 'string', 'max:1000'],
            'photo' => ['nullable', 'image', 'max:3072'],
        ];
    }

    public function bodyParameters(): array
    {
        return [
            'order_code' => ['example' => 'KM260928ABCDE'],
            'product_id' => ['example' => 1],
            'rating' => ['example' => 5],
            'comment' => ['example' => 'Kopinya enak, pas manisnya!'],
        ];
    }
}
