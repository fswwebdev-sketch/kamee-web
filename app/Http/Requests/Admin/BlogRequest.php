<?php

namespace App\Http\Requests\Admin;

use App\Enums\BlogStatus;
use App\Http\Requests\Admin\Concerns\AuthorizesModel;
use App\Models\Blog;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class BlogRequest extends FormRequest
{
    use AuthorizesModel;

    public function authorize(): bool
    {
        return $this->canManage(Blog::class, 'blog');
    }

    public function rules(): array
    {
        $required = $this->isMethod('POST') && ! $this->route('blog') ? 'required' : 'sometimes';

        return [
            'blog_category_id' => ['nullable', 'integer', 'exists:blog_categories,id'],
            'title' => [$required, 'string', 'max:200'],
            'slug' => ['sometimes', 'nullable', 'alpha_dash', 'max:220', Rule::unique('blogs', 'slug')->ignore($this->route('blog'))],
            'excerpt' => ['nullable', 'string', 'max:500'],
            'content' => [$required, 'string'],
            'cover' => ['nullable', 'image', 'max:4096'],
            'meta_title' => ['nullable', 'string', 'max:255'],
            'meta_description' => ['nullable', 'string', 'max:255'],
            'status' => ['sometimes', Rule::enum(BlogStatus::class)],
            'published_at' => ['nullable', 'date'],
        ];
    }

    public function bodyParameters(): array
    {
        return ['blog_category_id' => ['example' => 1], 'title' => ['example' => 'Cara Menyeduh V60 di Rumah'], 'excerpt' => ['example' => 'Panduan singkat menyeduh V60.'], 'content' => ['example' => '<p>Isi artikel</p>'], 'cover' => ['description' => 'Gambar sampul (multipart).', 'example' => null], 'status' => ['description' => 'draft | published', 'example' => 'published'], 'published_at' => ['example' => null]];
    }
}
