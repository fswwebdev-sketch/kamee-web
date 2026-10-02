<?php

namespace App\Http\Requests\Public;

use App\Enums\PaymentMethod;
use App\Rules\EnabledPaymentMethod;
use App\Services\Payments\MidtransGateway;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class PayOrderRequest extends FormRequest
{
    /** `payment_method` diterima sebagai alias `method`. */
    protected function prepareForValidation(): void
    {
        if (! $this->has('method') && $this->has('payment_method')) {
            $this->merge(['method' => $this->input('payment_method')]);
        }
    }

    public function rules(): array
    {
        $channels = match ($this->input('method')) {
            PaymentMethod::EWallet->value => MidtransGateway::EWALLETS,
            PaymentMethod::BankTransfer->value => MidtransGateway::BANKS,
            default => [],
        };

        return [
            'method' => ['required', Rule::enum(PaymentMethod::class)],
            'channel' => ['bail', $channels ? 'nullable' : 'prohibited', 'string', Rule::in($channels)],
        ];
    }

    /** Metode yang valid tetapi tidak diaktifkan (KAMEE_PAYMENT_METHODS) → 422 pada field payment_method. */
    public function after(): array
    {
        return [function (Validator $validator) {
            $method = $this->input('method');

            if ($validator->errors()->has('method') || PaymentMethod::tryFrom((string) $method) === null || EnabledPaymentMethod::allows($method)) {
                return;
            }

            $validator->errors()->add('payment_method', EnabledPaymentMethod::MESSAGE);
            $validator->errors()->add('method', EnabledPaymentMethod::MESSAGE);
        }];
    }

    public function bodyParameters(): array
    {
        return [
            'method' => ['description' => 'qris | ewallet | bank_transfer | cash (hanya yang aktif di KAMEE_PAYMENT_METHODS; default qris, cash). Alias: payment_method.', 'example' => 'qris'],
            'channel' => ['description' => 'E-wallet: gopay|shopeepay. VA: bca|bni|bri|cimb|permata.', 'example' => null],
        ];
    }
}
