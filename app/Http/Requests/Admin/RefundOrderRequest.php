<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class RefundOrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('refund', $this->route('order'));
    }

    public function rules(): array
    {
        return ['reason' => ['required', 'string', 'max:255']];
    }

    public function attributes(): array
    {
        return ['reason' => 'alasan refund'];
    }

    public function bodyParameters(): array
    {
        return ['reason' => ['example' => 'Stok bahan habis']];
    }
}
