<?php

namespace App\Http\Resources;

use App\Models\Product;
use App\Support\Media;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Product */
class ProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'short_description' => $this->short_description,
            'base_price' => $this->base_price,
            'image_url' => Media::url($this->image),
            'rating_avg' => $this->rating_avg,
            'review_count' => $this->review_count,
            'sold_count' => $this->sold_count,
            'is_featured' => $this->is_featured,
            'is_best_seller' => $this->is_best_seller,
            'is_active' => $this->is_active,
            'category' => new CategoryResource($this->whenLoaded('category')),
            'images' => ProductImageResource::collection($this->whenLoaded('images')),
            'option_groups' => OptionGroupResource::collection($this->whenLoaded('optionGroups')),
        ];
    }
}
