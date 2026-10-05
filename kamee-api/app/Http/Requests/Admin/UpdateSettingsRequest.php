<?php

namespace App\Http\Requests\Admin;

use App\Models\Setting;
use App\Rules\IndonesianPhone;
use Illuminate\Foundation\Http\FormRequest;

class UpdateSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('update', Setting::class);
    }

    public function rules(): array
    {
        return [
            'payment_timeout_minutes' => ['sometimes', 'integer', 'between:5,120'],
            'service_fee' => ['sometimes', 'integer', 'min:0'],
            'delivery_base_fee' => ['sometimes', 'integer', 'min:0'],
            'delivery_base_km' => ['sometimes', 'numeric', 'min:0'],
            'delivery_per_km_fee' => ['sometimes', 'integer', 'min:0'],
            'points_earn_per_amount' => ['sometimes', 'integer', 'min:1000'],
            'point_value' => ['sometimes', 'integer', 'min:1'],
            'points_max_redeem_percent' => ['sometimes', 'integer', 'between:0,100'],
            'points_min_redeem' => ['sometimes', 'integer', 'min:1'],
            'points_expiry_months' => ['sometimes', 'integer', 'between:1,60'],
            'whatsapp_number' => ['sometimes', new IndonesianPhone],
            'default_open_time' => ['sometimes', 'date_format:H:i'],
            'default_close_time' => ['sometimes', 'date_format:H:i'],
        ];
    }

    public function bodyParameters(): array
    {
        return [
            'delivery_base_fee' => ['description' => 'Ongkir dasar (rupiah).', 'example' => 8000],
            'delivery_per_km_fee' => ['description' => 'Tarif per km di atas jarak dasar.', 'example' => 2500],
            'points_earn_per_amount' => ['description' => 'Belanja per 1 poin (rasio poin).', 'example' => 10000],
            'whatsapp_number' => ['example' => '6281200000000'],
        ];
    }
}
