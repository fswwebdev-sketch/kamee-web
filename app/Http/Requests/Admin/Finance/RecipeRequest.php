<?php

namespace App\Http\Requests\Admin\Finance;

use App\Models\Recipe;
use Illuminate\Foundation\Http\FormRequest;

class RecipeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('create', Recipe::class);
    }

    public function rules(): array
    {
        return [
            'outlet_id' => ['nullable', 'integer'],
            'is_sample' => ['sometimes', 'boolean'],
            'note' => ['nullable', 'string', 'max:2000'],
            'variants' => ['present', 'array', 'max:20'],
            'variants.*.option_name' => ['nullable', 'string', 'max:100'],
            'variants.*.items' => ['present', 'array', 'max:50'],
            'variants.*.items.*.ingredient_id' => ['required', 'integer'],
            'variants.*.items.*.qty' => ['required', 'numeric', 'gt:0', 'max:1000000'],
        ];
    }

    public function attributes(): array
    {
        return [
            'variants' => 'varian', 'variants.*.option_name' => 'ukuran',
            'variants.*.items.*.ingredient_id' => 'bahan', 'variants.*.items.*.qty' => 'takaran',
        ];
    }

    public function bodyParameters(): array
    {
        return [
            'is_sample' => ['description' => 'Default false saat disimpan admin.', 'example' => false],
            'note' => ['description' => 'Opsional, cara membuat.', 'example' => null],
            'variants' => ['description' => 'Satu varian per opsi Ukuran (option_name null untuk menu tanpa ukuran).'],
        ];
    }
}
