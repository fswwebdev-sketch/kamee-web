<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class ConfirmPaymentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('updateStatus', $this->route('order'));
    }

    public function rules(): array
    {
        return ['note' => ['nullable', 'string', 'max:255']];
    }

    public function attributes(): array
    {
        return ['note' => 'catatan'];
    }

    public function bodyParameters(): array
    {
        return ['note' => ['description' => 'Opsional, mis. 4 digit akhir referensi GoPay.', 'example' => 'Mutasi GoPay 10:12, ref 8841']];
    }
}
