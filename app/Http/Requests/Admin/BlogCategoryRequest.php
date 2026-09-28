<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\Admin\Concerns\AuthorizesModel;
use App\Models\BlogCategory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BlogCategoryRequest extends FormRequest
{
    use AuthorizesModel;

    public function authorize(): bool
    {
        return $this->canManage(BlogCategory::class, 'blog_category');
    }

    public function rules(): array
    {
        return [
            'name' => [$this->isMethod('POST') ? 'required' : 'sometimes', 'string', 'max:100'],
            'slug' => ['sometimes', 'nullable', 'alpha_dash', 'max:120', Rule::unique('blog_categories', 'slug')->ignore($this->route('blog_category'))],
        ];
    }

    public function bodyParameters(): array
    {
        return ['name' => ['example' => 'Tips Kopi']];
    }
}
