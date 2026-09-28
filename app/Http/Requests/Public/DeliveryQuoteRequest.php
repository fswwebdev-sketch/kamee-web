<?php

namespace App\Http\Requests\Public;

use Illuminate\Foundation\Http\FormRequest;

class DeliveryQuoteRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'outlet_id' => ['required', 'integer', 'exists:outlets,id'],
            'lat' => ['required', 'numeric', 'between:-90,90'],
            'lng' => ['required', 'numeric', 'between:-180,180'],
        ];
    }

    public function bodyParameters(): array
    {
        return [
            'outlet_id' => ['example' => 1],
            'lat' => ['description' => 'Latitude tujuan.', 'example' => -6.178],
            'lng' => ['description' => 'Longitude tujuan.', 'example' => 106.631],
        ];
    }
}
