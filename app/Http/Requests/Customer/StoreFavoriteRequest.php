<?php

namespace App\Http\Requests\Customer;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreFavoriteRequest extends FormRequest
{
    public function rules(): array
    {
        return ['product_id' => ['required', 'integer', Rule::exists('products', 'id')->whereNull('deleted_at')]];
    }

    public function bodyParameters(): array
    {
        return ['product_id' => ['example' => 1]];
    }
}
