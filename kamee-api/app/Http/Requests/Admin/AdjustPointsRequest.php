<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class AdjustPointsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('adjustPoints', $this->route('customer'));
    }

    public function rules(): array
    {
        return [
            'points' => ['required', 'integer', 'not_in:0', 'between:-100000,100000'],
            'note' => ['required', 'string', 'max:255'],
        ];
    }

    public function bodyParameters(): array
    {
        return [
            'points' => ['description' => 'Positif untuk menambah, negatif untuk mengurangi.', 'example' => 25],
            'note' => ['example' => 'Kompensasi pesanan terlambat'],
        ];
    }
}
