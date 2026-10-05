<?php

namespace App\Http\Requests\Admin\Finance;

use Illuminate\Foundation\Http\FormRequest;

class AdjustStockRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('update', $this->route('ingredient'));
    }

    public function rules(): array
    {
        return [
            'counted_qty' => ['required', 'numeric', 'min:0', 'max:1000000000'],
            'note' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function attributes(): array
    {
        return ['counted_qty' => 'jumlah hitung fisik', 'note' => 'catatan'];
    }

    public function bodyParameters(): array
    {
        return ['counted_qty' => ['description' => 'Hasil hitung fisik dalam satuan bahan.', 'example' => 18500]];
    }
}
