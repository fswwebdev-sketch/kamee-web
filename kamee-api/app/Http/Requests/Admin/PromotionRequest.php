<?php

namespace App\Http\Requests\Admin;

use App\Enums\PromotionType;
use App\Http\Requests\Admin\Concerns\AuthorizesModel;
use App\Models\Promotion;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PromotionRequest extends FormRequest
{
    use AuthorizesModel;

    public function authorize(): bool
    {
        return $this->canManage(Promotion::class, 'promotion');
    }

    public function rules(): array
    {
        $required = $this->isMethod('POST') ? 'required' : 'sometimes';

        return [
            'code' => ['nullable', 'string', 'max:50', 'alpha_dash', Rule::unique('promotions', 'code')->ignore($this->route('promotion'))],
            'name' => [$required, 'string', 'max:150'],
            'type' => [$required, Rule::enum(PromotionType::class)],
            'value' => [$this->input('type') === PromotionType::Percent->value ? 'between:1,100' : 'min:0', $required, 'integer'],
            'min_spend' => ['sometimes', 'integer', 'min:0'],
            'max_discount' => ['nullable', 'integer', 'min:0'],
            'quota' => ['nullable', 'integer', 'min:1'],
            'per_customer_limit' => ['nullable', 'integer', 'min:1'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
            'outlet_id' => ['nullable', 'integer', 'exists:outlets,id'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function bodyParameters(): array
    {
        return [
            'code' => ['description' => 'Kosongkan untuk promo otomatis.', 'example' => 'KAMEEHEMAT'],
            'name' => ['example' => 'Hemat 20% maks 15rb'],
            'type' => ['description' => 'percent | fixed | bogo | free_delivery', 'example' => 'percent'],
            'value' => ['example' => 20],
            'min_spend' => ['example' => 40000],
            'max_discount' => ['example' => 15000],
        ];
    }
}
