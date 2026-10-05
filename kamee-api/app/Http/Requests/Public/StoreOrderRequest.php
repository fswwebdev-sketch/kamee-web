<?php

namespace App\Http\Requests\Public;

use App\Enums\FulfillmentType;
use App\Enums\PaymentMethod;
use App\Rules\EnabledPaymentMethod;
use App\Rules\IndonesianPhone;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreOrderRequest extends FormRequest
{
    public function rules(): array
    {
        $delivery = $this->input('fulfillment') === FulfillmentType::Delivery->value;

        return [
            'outlet_id' => ['required', 'integer', 'exists:outlets,id'],
            'customer' => ['required', 'array'],
            'customer.name' => ['required', 'string', 'max:100'],
            'customer.phone' => ['required', new IndonesianPhone],
            'fulfillment' => ['required', Rule::enum(FulfillmentType::class)],
            'address' => [$delivery ? 'required' : 'nullable', 'array'],
            'address.text' => [$delivery ? 'required' : 'nullable', 'string', 'max:500'],
            'address.lat' => [$delivery ? 'required' : 'nullable', 'numeric', 'between:-90,90'],
            'address.lng' => [$delivery ? 'required' : 'nullable', 'numeric', 'between:-180,180'],
            'address.note' => ['nullable', 'string', 'max:200'],
            'scheduled_at' => ['nullable', 'date'],
            'items' => ['required', 'array', 'min:1', 'max:30'],
            'items.*.product_id' => ['required', 'integer'],
            'items.*.qty' => ['required', 'integer', 'min:1', 'max:50'],
            'items.*.option_ids' => ['nullable', 'array', 'max:15'],
            'items.*.option_ids.*' => ['integer'],
            'items.*.note' => ['nullable', 'string', 'max:200'],
            'promo_code' => ['nullable', 'string', 'max:50'],
            'redeem_points' => ['nullable', 'integer', 'min:0'],
            'note' => ['nullable', 'string', 'max:500'],
            'payment_method' => ['nullable', 'bail', Rule::enum(PaymentMethod::class), new EnabledPaymentMethod],
        ];
    }

    public function bodyParameters(): array
    {
        return [
            'outlet_id' => ['example' => 1],
            'customer.name' => ['example' => 'Dinda'],
            'customer.phone' => ['example' => '6281234567890'],
            'fulfillment' => ['description' => 'pickup | delivery | dine_in', 'example' => 'delivery'],
            'address.text' => ['example' => 'Jl. Merdeka 10'],
            'address.lat' => ['example' => -6.178],
            'address.lng' => ['example' => 106.631],
            'address.note' => ['example' => 'Pagar hitam'],
            'scheduled_at' => ['description' => 'Opsional, pesanan terjadwal (ISO 8601).', 'example' => null],
            'items' => ['description' => 'Daftar item keranjang.'],
            'items.*.product_id' => ['example' => 1],
            'items.*.qty' => ['example' => 2],
            'items.*.option_ids' => ['description' => 'ID opsi (ukuran, gula, es, topping).', 'example' => [1, 4]],
            'items.*.note' => ['example' => 'less ice'],
            'promo_code' => ['example' => 'KAMEEHEMAT'],
            'redeem_points' => ['description' => 'Poin yang ditukar (khusus member login).', 'example' => 0],
            'note' => ['example' => 'Tolong sedotan kertas'],
            'payment_method' => ['description' => 'Opsional, metode bayar yang akan dipakai (qris | cash secara default). Ditolak bila tidak aktif.', 'example' => 'qris'],
        ];
    }
}
