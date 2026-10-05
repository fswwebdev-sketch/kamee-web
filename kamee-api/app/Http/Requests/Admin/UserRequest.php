<?php

namespace App\Http\Requests\Admin;

use App\Enums\UserRole;
use App\Http\Requests\Admin\Concerns\AuthorizesModel;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class UserRequest extends FormRequest
{
    use AuthorizesModel;

    public function authorize(): bool
    {
        return $this->canManage(User::class, 'user');
    }

    public function rules(): array
    {
        $creating = $this->isMethod('POST');
        $required = $creating ? 'required' : 'sometimes';

        return [
            'name' => [$required, 'string', 'max:100'],
            'email' => [$required, 'email', 'max:150', Rule::unique('users', 'email')->ignore($this->route('user'))],
            'password' => [$creating ? 'required' : 'nullable', 'string', Password::min(8)],
            'role' => [$required, Rule::enum(UserRole::class)],
            'outlet_id' => [
                Rule::requiredIf(fn () => $this->input('role') === UserRole::OutletAdmin->value),
                'nullable', 'integer', 'exists:outlets,id',
            ],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function messages(): array
    {
        return ['outlet_id.required' => 'Admin Outlet wajib memiliki outlet.'];
    }

    public function bodyParameters(): array
    {
        return ['name' => ['example' => 'Admin Kamee BSD'], 'email' => ['example' => 'admin.bsd@kamee.id'], 'password' => ['example' => 'rahasia123'], 'role' => ['description' => 'super_admin | outlet_admin', 'example' => 'outlet_admin'], 'outlet_id' => ['example' => 1], 'is_active' => ['example' => true]];
    }
}
