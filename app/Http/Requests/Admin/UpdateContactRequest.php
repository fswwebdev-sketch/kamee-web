<?php

namespace App\Http\Requests\Admin;

use App\Enums\ContactStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateContactRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('update', $this->route('contact'));
    }

    public function rules(): array
    {
        return ['status' => ['required', Rule::enum(ContactStatus::class)]];
    }

    public function bodyParameters(): array
    {
        return ['status' => ['description' => 'new | read | replied', 'example' => 'read']];
    }
}
