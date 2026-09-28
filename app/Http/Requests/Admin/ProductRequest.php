<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\Admin\Concerns\AuthorizesModel;
use App\Models\Product;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProductRequest extends FormRequest
{
    use AuthorizesModel;

    public function authorize(): bool
    {
        return $this->canManage(Product::class, 'product');
    }

    public function rules(): array
    {
        $required = $this->isMethod('POST') && ! $this->route('product') ? 'required' : 'sometimes';
        $id = $this->route('product')?->id;

        return [
            'category_id' => [$required, 'integer', 'exists:categories,id'],
            'name' => [$required, 'string', 'max:150'],
            'slug' => ['sometimes', 'nullable', 'string', 'max:180', 'alpha_dash', Rule::unique('products', 'slug')->ignore($id)],
            'short_description' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'composition' => ['nullable', 'string'],
            'calories' => ['nullable', 'integer', 'min:0'],
            'base_price' => [$required, 'integer', 'min:0', 'max:10000000'],
            'image' => ['nullable', 'image', 'max:3072'],
            'is_featured' => ['sometimes', 'boolean'],
            'is_best_seller' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
            'option_group_ids' => ['sometimes', 'array'],
            'option_group_ids.*' => ['integer', 'exists:option_groups,id'],
        ];
    }

    public function bodyParameters(): array
    {
        return [
            'category_id' => ['example' => 1],
            'name' => ['example' => 'Es Kopi Susu Aren'],
            'base_price' => ['example' => 22000],
            'option_group_ids' => ['description' => 'Urutan grup opsi (Ukuran, Gula, Es, Topping).', 'example' => [1, 2, 3, 4]],
        ];
    }
}
