<?php

namespace App\Http\Requests\Admin;

use App\Enums\OptionGroupType;
use App\Http\Requests\Admin\Concerns\AuthorizesModel;
use App\Models\OptionGroup;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class OptionGroupRequest extends FormRequest
{
    use AuthorizesModel;

    public function authorize(): bool
    {
        return $this->canManage(OptionGroup::class, 'option_group');
    }

    public function rules(): array
    {
        $required = $this->isMethod('POST') ? 'required' : 'sometimes';

        return [
            'name' => [$required, 'string', 'max:100'],
            'type' => [$required, Rule::enum(OptionGroupType::class)],
            'is_required' => ['sometimes', 'boolean'],
            'options' => [$required, 'array', 'min:1'],
            'options.*.id' => ['nullable', 'integer'],
            'options.*.name' => ['required', 'string', 'max:100'],
            'options.*.price_delta' => ['required', 'integer', 'between:-1000000,1000000'],
        ];
    }

    public function bodyParameters(): array
    {
        return [
            'name' => ['example' => 'Ukuran'],
            'type' => ['description' => 'single | multi', 'example' => 'single'],
            'is_required' => ['example' => true],
            'options' => ['example' => [['name' => 'Regular', 'price_delta' => 0], ['name' => 'Large', 'price_delta' => 5000]]],
        ];
    }
}
