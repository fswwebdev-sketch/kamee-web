<?php

namespace App\Http\Requests\Admin;

use App\Enums\PaymentMethod;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ConfirmPaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('updateStatus', $this->route('order'));
    }

    public function rules(): array
    {
        return [
            'note' => ['nullable', 'string', 'max:255'],
            'method' => ['nullable', Rule::in(PaymentMethod::bookkeepingValues())],
            'bank' => ['nullable', 'string', 'max:50'],
        ];
    }

    public function paymentMethod(): PaymentMethod
    {
        return PaymentMethod::from($this->input('method') ?: PaymentMethod::Qris->value);
    }

    public function attributes(): array
    {
        return ['note' => 'catatan', 'method' => 'metode pembayaran', 'bank' => 'bank'];
    }

    public function bodyParameters(): array
    {
        return [
            'note' => ['description' => 'Opsional, mis. 4 digit akhir referensi GoPay.', 'example' => 'Mutasi GoPay 10:12, ref 8841'],
            'method' => ['description' => 'qris | bank_transfer | cash (default qris).', 'example' => 'qris'],
            'bank' => ['description' => 'Nama bank untuk transfer, mis. BCA.', 'example' => null],
        ];
    }
}
