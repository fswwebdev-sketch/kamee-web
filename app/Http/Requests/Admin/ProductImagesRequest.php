<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class ProductImagesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('update', $this->route('product'));
    }

    public function rules(): array
    {
        return [
            'images' => ['required', 'array', 'min:1', 'max:8'],
            'images.*' => ['image', 'max:3072'],
            'alt' => ['nullable', 'string', 'max:150'],
        ];
    }

    public function bodyParameters(): array
    {
        return ['images' => ['description' => 'Berkas gambar (multipart, maks 8).', 'example' => null], 'alt' => ['example' => 'Es Kopi Susu Aren']];
    }
}
