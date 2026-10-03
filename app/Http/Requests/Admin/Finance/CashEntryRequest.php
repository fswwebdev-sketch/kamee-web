<?php

namespace App\Http\Requests\Admin\Finance;

use App\Enums\CashCategory;
use App\Enums\CashEntryType;
use App\Enums\PaymentMethod;
use App\Http\Requests\Admin\Concerns\AuthorizesModel;
use App\Models\CashEntry;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CashEntryRequest extends FormRequest
{
    use AuthorizesModel;

    public function authorize(): bool
    {
        return $this->canManage(CashEntry::class, 'cash_entry');
    }

    public function rules(): array
    {
        $required = $this->isMethod('POST') ? 'required' : 'sometimes';

        /** @var CashEntry|null $entry */
        $entry = $this->route('cash_entry');
        $type = CashEntryType::tryFrom((string) $this->input('type')) ?? $entry?->type;
        $categories = $type ? CashCategory::valuesFor($type) : CashCategory::values();

        return [
            'outlet_id' => ['nullable', 'integer'],
            'date' => [$required, 'date_format:Y-m-d'],
            'type' => [$required, Rule::enum(CashEntryType::class)],
            'category' => [$required, Rule::in($categories)],
            'description' => [$required, 'string', 'max:255'],
            'amount' => [$required, 'integer', 'min:1', 'max:10000000000'],
            'method' => [$required, Rule::in(PaymentMethod::bookkeepingValues())],
            'bank' => ['nullable', 'string', 'max:50'],
            'counterparty' => ['nullable', 'string', 'max:100'],
            'note' => ['nullable', 'string', 'max:255'],
        ];
    }

    public function attributes(): array
    {
        return [
            'date' => 'tanggal', 'type' => 'jenis', 'category' => 'kategori', 'description' => 'keterangan',
            'amount' => 'nominal', 'method' => 'metode', 'counterparty' => 'pihak terkait', 'note' => 'catatan',
        ];
    }

    public function messages(): array
    {
        return ['category.in' => 'Kategori tidak sesuai dengan jenis transaksi.'];
    }

    /** @return array<string, mixed> */
    public function entryData(): array
    {
        $data = collect($this->validated())->except('outlet_id')->all();

        $method = $data['method'] ?? $this->route('cash_entry')?->method?->value;
        if ($method !== null && $method !== PaymentMethod::BankTransfer->value) {
            $data['bank'] = null;
        }

        return $data;
    }

    public function bodyParameters(): array
    {
        return [
            'date' => ['example' => '2026-09-21'],
            'type' => ['description' => 'income | expense', 'example' => 'income'],
            'category' => ['description' => 'income: penjualan, modal, lainnya_masuk; expense: bahan_baku, kemasan, ongkir, operasional, gaji, sewa, lainnya', 'example' => 'penjualan'],
            'description' => ['example' => 'Penjualan — Nur'],
            'amount' => ['example' => 91000],
            'method' => ['description' => 'cash | qris | bank_transfer', 'example' => 'bank_transfer'],
            'bank' => ['example' => 'BCA'],
        ];
    }
}
