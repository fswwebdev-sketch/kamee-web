<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

class UpdateAvailabilityRequest extends FormRequest
{
    public function authorize(): bool
    {
        return (bool) $this->user()?->can('manageAvailability', $this->route('outlet'));
    }

    public function rules(): array
    {
        return ['is_available' => ['required', 'boolean']];
    }

    public function bodyParameters(): array
    {
        return ['is_available' => ['description' => 'false = tandai habis.', 'example' => false]];
    }
}
