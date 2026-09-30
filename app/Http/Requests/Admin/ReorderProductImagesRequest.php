<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class ReorderProductImagesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'distinct'],
        ];
    }

    public function bodyParameters(): array
    {
        return ['ids' => ['description' => 'Seluruh ID gambar galeri produk dalam urutan baru.', 'example' => [12, 10, 11]]];
    }
}
