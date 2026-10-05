<?php

namespace App\Http\Resources;

use App\Models\Banner;
use App\Support\Media;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Banner */
class BannerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'subtitle' => $this->subtitle,
            'image_desktop_url' => Media::url($this->image_desktop),
            'image_mobile_url' => Media::url($this->image_mobile ?? $this->image_desktop),
            'link_url' => $this->link_url,
            'placement' => $this->placement,
            'sort_order' => $this->sort_order,
            'starts_at' => $this->starts_at?->toIso8601String(),
            'ends_at' => $this->ends_at?->toIso8601String(),
            'is_active' => $this->is_active,
        ];
    }
}
