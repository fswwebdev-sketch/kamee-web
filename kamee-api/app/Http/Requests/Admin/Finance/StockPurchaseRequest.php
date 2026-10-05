<?php

namespace App\Http\Requests\Admin\Finance;

use App\Enums\PaymentMethod;
use App\Models\StockPurchase;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StockPurchaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('create', StockPurchase::class);
    }

    public function rules(): array
    {
        return [
            'outlet_id' => ['nullable', 'integer'],
            'date' => ['required', 'date_format:Y-m-d'],
            'supplier' => ['nullable', 'string', 'max:150'],
            'method' => ['required', Rule::in(PaymentMethod::bookkeepingValues())],
            'bank' => ['nullable', 'string', 'max:50'],
            'note' => ['nullable', 'string', 'max:255'],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.ingredient_id' => ['required', 'integer'],
            'items.*.packs' => ['required', 'numeric', 'gt:0', 'max:100000'],
            'items.*.pack_price' => ['required', 'integer', 'min:0', 'max:1000000000'],
        ];
    }

    public function attributes(): array
    {
        return [
            'date' => 'tanggal', 'method' => 'metode bayar', 'items' => 'item belanja',
            'items.*.ingredient_id' => 'bahan', 'items.*.packs' => 'jumlah kemasan', 'items.*.pack_price' => 'harga per kemasan',
        ];
    }

    public function bodyParameters(): array
    {
        return [
            'date' => ['example' => '2026-09-20'],
            'supplier' => ['example' => 'Toko Bahan Kopi'],
            'method' => ['description' => 'cash | qris | bank_transfer', 'example' => 'cash'],
            'bank' => ['description' => 'Nama bank bila transfer.', 'example' => null],
            'items' => ['description' => 'Item belanja: ingredient_id, packs, pack_price.'],
        ];
    }
}
