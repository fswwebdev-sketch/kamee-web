<?php

namespace App\Http\Requests\Customer;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProfileRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:100'],
            'email' => ['sometimes', 'nullable', 'email', 'max:150'],
            'birth_date' => ['sometimes', 'nullable', 'date', 'before:today'],
        ];
    }

    public function bodyParameters(): array
    {
        return [
            'name' => ['example' => 'Dinda Putri'],
            'email' => ['example' => 'dinda@example.com'],
            'birth_date' => ['example' => '1998-05-17'],
        ];
    }
}
