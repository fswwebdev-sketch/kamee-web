<?php

namespace App\Http\Requests\Customer;

use Illuminate\Foundation\Http\FormRequest;

class CustomerAddressRequest extends FormRequest
{
    public function rules(): array
    {
        $required = $this->isMethod('POST') ? 'required' : 'sometimes';

        return [
            'label' => [$required, 'string', 'max:50'],
            'address' => [$required, 'string', 'max:500'],
            'lat' => ['nullable', 'numeric', 'between:-90,90'],
            'lng' => ['nullable', 'numeric', 'between:-180,180'],
            'note' => ['nullable', 'string', 'max:200'],
            'is_default' => ['sometimes', 'boolean'],
        ];
    }

    public function bodyParameters(): array
    {
        return [
            'label' => ['example' => 'Rumah'],
            'address' => ['example' => 'Jl. Merdeka 10, Tangerang'],
            'lat' => ['example' => -6.178],
            'lng' => ['example' => 106.631],
            'note' => ['example' => 'Pagar hitam'],
            'is_default' => ['example' => true],
        ];
    }
}
