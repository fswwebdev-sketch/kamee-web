<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\Admin\Concerns\AuthorizesModel;
use App\Models\Banner;
use Illuminate\Foundation\Http\FormRequest;

class BannerRequest extends FormRequest
{
    use AuthorizesModel;

    public function authorize(): bool
    {
        return $this->canManage(Banner::class, 'banner');
    }

    public function rules(): array
    {
        $required = $this->isMethod('POST') ? 'required' : 'sometimes';

        return [
            'title' => [$required, 'string', 'max:150'],
            'subtitle' => ['nullable', 'string', 'max:255'],
            'image_desktop' => [$this->isMethod('POST') ? 'required_without:image_desktop_file' : 'sometimes', 'nullable', 'string', 'max:255'],
            'image_desktop_file' => ['nullable', 'image', 'max:4096'],
            'image_mobile' => ['nullable', 'string', 'max:255'],
            'image_mobile_file' => ['nullable', 'image', 'max:4096'],
            'link_url' => ['nullable', 'string', 'max:255'],
            'placement' => ['sometimes', 'string', 'max:50'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after:starts_at'],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    public function bodyParameters(): array
    {
        return ['title' => ['example' => 'Ngopi Hemat 20%'], 'subtitle' => ['example' => 'Pakai kode KAMEEHEMAT'], 'image_desktop' => ['description' => 'Path/URL gambar desktop (atau kirim image_desktop_file).', 'example' => 'banners/promo.jpg'], 'image_desktop_file' => ['description' => 'Unggah gambar desktop (multipart).', 'example' => null], 'image_mobile' => ['example' => null], 'image_mobile_file' => ['example' => null], 'link_url' => ['example' => '/promo'], 'placement' => ['example' => 'home'], 'sort_order' => ['example' => 1], 'starts_at' => ['example' => '2026-10-01 00:00:00'], 'ends_at' => ['example' => '2026-10-31 23:59:59'], 'is_active' => ['example' => true]];
    }
}
