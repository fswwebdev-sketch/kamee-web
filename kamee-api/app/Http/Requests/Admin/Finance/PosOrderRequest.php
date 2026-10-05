<?php

namespace App\Http\Requests\Admin\Finance;

use App\Enums\FulfillmentType;
use App\Enums\PaymentMethod;
use App\Models\Order;
use App\Rules\IndonesianPhone;
use App\Services\Pricing\CartItem;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PosOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('viewAny', Order::class);
    }

    public function rules(): array
    {
        return [
            'outlet_id' => ['nullable', 'integer'],
            'items' => ['required', 'array', 'min:1', 'max:30'],
            'items.*.product_id' => ['required', 'integer'],
            'items.*.qty' => ['required', 'integer', 'min:1', 'max:50'],
            'items.*.option_ids' => ['nullable', 'array', 'max:15'],
            'items.*.option_ids.*' => ['integer'],
            'items.*.note' => ['nullable', 'string', 'max:200'],
            'customer_name' => ['nullable', 'string', 'max:100'],
            'customer_phone' => ['nullable', new IndonesianPhone],
            'fulfillment' => ['nullable', Rule::in([FulfillmentType::DineIn->value, FulfillmentType::Pickup->value])],
            'payment_method' => ['required', Rule::in(PaymentMethod::bookkeepingValues())],
            'bank' => ['nullable', 'string', 'max:50'],
            'cash_received' => ['nullable', 'integer', 'min:0', 'max:100000000'],
            'note' => ['nullable', 'string', 'max:500'],
        ];
    }

    /** @return list<CartItem> */
    public function cartItems(): array
    {
        return array_map(fn (array $item) => CartItem::fromArray($item), $this->validated('items'));
    }

    public function attributes(): array
    {
        return [
            'items' => 'item', 'customer_name' => 'nama pembeli', 'customer_phone' => 'nomor WA',
            'payment_method' => 'metode bayar', 'cash_received' => 'uang diterima',
        ];
    }

    public function bodyParameters(): array
    {
        return [
            'items' => ['description' => 'Item: product_id, qty, option_ids, note.'],
            'items.*.product_id' => ['example' => 5],
            'items.*.qty' => ['example' => 2],
            'items.*.option_ids' => ['example' => [10]],
            'customer_name' => ['description' => 'Default "Pembeli langsung".', 'example' => null],
            'fulfillment' => ['description' => 'dine_in | pickup (default dine_in)', 'example' => 'dine_in'],
            'payment_method' => ['description' => 'cash | qris | bank_transfer', 'example' => 'cash'],
            'cash_received' => ['description' => 'Uang diterima (tunai). Kurang dari total → 422.', 'example' => 50000],
        ];
    }
}
