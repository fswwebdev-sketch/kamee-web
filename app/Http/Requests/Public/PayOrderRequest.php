<?php

namespace App\Http\Requests\Public;

use App\Enums\PaymentMethod;
use App\Services\Payments\MidtransGateway;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PayOrderRequest extends FormRequest
{
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

    public function bodyParameters(): array
    {
        return [
            'method' => ['description' => 'qris | ewallet | bank_transfer | cash', 'example' => 'qris'],
            'channel' => ['description' => 'E-wallet: gopay|shopeepay. VA: bca|bni|bri|cimb|permata.', 'example' => null],
        ];
    }
}
