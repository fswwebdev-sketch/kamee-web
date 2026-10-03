<?php

namespace App\Http\Requests\Admin\Finance;

use App\Enums\IngredientKind;
use App\Enums\IngredientUnit;
use App\Http\Requests\Admin\Concerns\AuthorizesModel;
use App\Models\Ingredient;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IngredientRequest extends FormRequest
{
    use AuthorizesModel;

    public function authorize(): bool
    {
        return $this->canManage(Ingredient::class, 'ingredient');
    }

    public function rules(): array
    {
        $creating = $this->isMethod('POST');

        return [
            'outlet_id' => ['nullable', 'integer'],
            'name' => [$creating ? 'required' : 'sometimes', 'string', 'max:120'],
            'kind' => ['sometimes', Rule::enum(IngredientKind::class)],
            'unit' => ['sometimes', Rule::enum(IngredientUnit::class)],
            'pack_label' => ['nullable', 'string', 'max:100'],
            'pack_size' => ['sometimes', 'numeric', 'gt:0', 'max:100000000'],
            'pack_price' => ['sometimes', 'integer', 'min:0', 'max:4000000000'],
            'min_stock' => ['nullable', 'numeric', 'min:0'],
            'note' => ['nullable', 'string', 'max:255'],
            'is_active' => ['sometimes', 'boolean'],
            'opening_stock' => $creating ? ['nullable', 'numeric', 'min:0'] : ['prohibited'],
        ];
    }

    public function attributes(): array
    {
        return [
            'name' => 'nama', 'kind' => 'jenis', 'unit' => 'satuan', 'pack_label' => 'label kemasan',
            'pack_size' => 'isi per kemasan', 'pack_price' => 'harga per kemasan', 'min_stock' => 'stok minimum',
            'note' => 'catatan', 'opening_stock' => 'stok awal',
        ];
    }

    public function messages(): array
    {
        return ['opening_stock.prohibited' => 'Stok awal hanya bisa diisi saat menambah bahan. Gunakan stok opname untuk mengoreksi stok.'];
    }

    /** @return array<string, mixed> */
    public function ingredientData(): array
    {
        return collect($this->validated())->except('outlet_id')->all();
    }

    public function bodyParameters(): array
    {
        return [
            'name' => ['example' => 'Susu Rich Milk Diamond'],
            'kind' => ['description' => 'bahan | kemasan', 'example' => 'bahan'],
            'unit' => ['description' => 'ml | gram | pcs', 'example' => 'ml'],
            'pack_label' => ['example' => '1 kotak (1 liter)'],
            'pack_size' => ['description' => 'Isi per kemasan beli dalam satuan.', 'example' => 1000],
            'pack_price' => ['example' => 23500],
            'min_stock' => ['example' => 2000],
            'opening_stock' => ['description' => 'Opsional, hanya saat tambah (mutasi opening).', 'example' => 0],
        ];
    }
}
