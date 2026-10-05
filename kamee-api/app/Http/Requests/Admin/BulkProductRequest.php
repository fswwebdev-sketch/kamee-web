<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class BulkProductRequest extends FormRequest
{
    public const ACTIONS = ['activate', 'deactivate', 'feature', 'unfeature', 'best_seller', 'unbest_seller', 'delete'];

    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ids' => ['required', 'array', 'min:1', 'max:100'],
            'ids.*' => ['integer', 'distinct', 'exists:products,id'],
            'action' => ['required', 'in:'.implode(',', self::ACTIONS)],
        ];
    }

    public function bodyParameters(): array
    {
        return [
            'ids' => ['description' => 'ID produk (maks. 100).', 'example' => [1, 2, 3]],
            'action' => ['description' => implode(' | ', self::ACTIONS), 'example' => 'deactivate'],
        ];
    }
}
