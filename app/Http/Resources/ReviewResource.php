<?php

namespace App\Http\Resources;

use App\Models\Review;
use App\Support\Media;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Review */
class ReviewResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'rating' => $this->rating,
            'comment' => $this->comment,
            'photo_url' => Media::url($this->photo),
            'reply' => $this->reply,
            'customer_name' => $this->whenLoaded('customer', fn () => $this->maskName($this->customer->name)),
            'product' => $this->whenLoaded('product', fn () => ['id' => $this->product->id, 'name' => $this->product->name, 'slug' => $this->product->slug]),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }

    private function maskName(string $name): string
    {
        $parts = explode(' ', trim($name));

        return $parts[0].(isset($parts[1]) ? ' '.mb_substr($parts[1], 0, 1).'.' : '');
    }
}
