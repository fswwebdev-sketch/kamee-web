<?php

namespace App\Http\Requests\Admin;

use App\Enums\OrderStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateOrderStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('updateStatus', $this->route('order'));
    }

    public function rules(): array
    {
        return [
            'status' => ['required', Rule::enum(OrderStatus::class)],
            'note' => [$this->input('status') === OrderStatus::Cancelled->value ? 'required' : 'nullable', 'string', 'max:255'],
        ];
    }

    public function messages(): array
    {
        return ['note.required' => 'Alasan pembatalan wajib diisi.'];
    }

    public function bodyParameters(): array
    {
        return [
            'status' => ['description' => 'Status tujuan.', 'example' => 'processing'],
            'note' => ['description' => 'Catatan (wajib untuk pembatalan).', 'example' => 'Mulai diracik'],
        ];
    }
}
