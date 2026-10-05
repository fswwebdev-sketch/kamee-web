<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class LoginRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'device_name' => ['nullable', 'string', 'max:100'],
        ];
    }

    public function bodyParameters(): array
    {
        return [
            'email' => ['example' => 'superadmin@kamee.id'],
            'password' => ['example' => 'password'],
            'device_name' => ['example' => 'dashboard-web'],
        ];
    }
}
