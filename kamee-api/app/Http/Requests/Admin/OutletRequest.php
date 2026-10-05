<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\Admin\Concerns\AuthorizesModel;
use App\Models\Outlet;
use App\Rules\IndonesianPhone;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class OutletRequest extends FormRequest
{
    use AuthorizesModel;

    public function authorize(): bool
    {
        return $this->canManage(Outlet::class, 'outlet');
    }

    public function rules(): array
    {
        $required = $this->isMethod('POST') ? 'required' : 'sometimes';

        return [
            'name' => [$required, 'string', 'max:150'],
            'slug' => ['sometimes', 'nullable', 'alpha_dash', 'max:180', Rule::unique('outlets', 'slug')->ignore($this->route('outlet'))],
            'address' => [$required, 'string', 'max:500'],
            'city' => [$required, 'string', 'max:100'],
            'lat' => [$required, 'numeric', 'between:-90,90'],
            'lng' => [$required, 'numeric', 'between:-180,180'],
            'phone_wa' => [$required, new IndonesianPhone],
            'open_time' => ['sometimes', 'date_format:H:i'],
            'close_time' => ['sometimes', 'date_format:H:i'],
            'is_open' => ['sometimes', 'boolean'],
            'delivery_radius_km' => ['sometimes', 'numeric', 'between:0,50'],
        ];
    }

    public function bodyParameters(): array
    {
        return ['name' => ['example' => 'Kamee Coffee BSD'], 'address' => ['example' => 'Jl. Pahlawan Seribu, BSD'], 'city' => ['example' => 'Tangerang Selatan'], 'lat' => ['example' => -6.3012], 'lng' => ['example' => 106.6528], 'phone_wa' => ['example' => '081211110003'], 'open_time' => ['example' => '07:00'], 'close_time' => ['example' => '22:00'], 'is_open' => ['example' => true], 'delivery_radius_km' => ['example' => 7]];
    }
}
