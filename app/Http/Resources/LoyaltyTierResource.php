<?php

namespace App\Http\Resources;

use App\Models\LoyaltyTier;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin LoyaltyTier */
class LoyaltyTierResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'min_spend' => $this->min_spend,
            'point_multiplier' => $this->point_multiplier,
            'perks' => $this->perks ?? [],
        ];
    }
}
