<?php

namespace App\Http\Resources;

use App\Models\Product;
use Illuminate\Http\Request;

/** @mixin Product */
class ProductDetailResource extends ProductResource
{
    /** @var array<int,int> jumlah ulasan per bintang */
    private array $ratingBreakdown = [];

    public function withRatingBreakdown(array $breakdown): static
    {
        $this->ratingBreakdown = $breakdown;

        return $this;
    }

    public function toArray(Request $request): array
    {
        return parent::toArray($request) + [
            'description' => $this->description,
            'composition' => $this->composition,
            'calories' => $this->calories,
            'rating_summary' => [
                'average' => $this->rating_avg,
                'count' => $this->review_count,
                'breakdown' => (object) collect([5, 4, 3, 2, 1])->mapWithKeys(fn (int $star) => [(string) $star => (int) ($this->ratingBreakdown[$star] ?? 0)])->all(),
            ],
        ];
    }
}
