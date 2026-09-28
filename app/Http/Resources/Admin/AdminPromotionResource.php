<?php

namespace App\Http\Resources\Admin;

use App\Http\Resources\PromotionResource;
use App\Models\Promotion;
use Illuminate\Http\Request;

/** @mixin Promotion */
class AdminPromotionResource extends PromotionResource
{
    public function toArray(Request $request): array
    {
        return parent::toArray($request) + [
            'quota' => $this->quota,
            'used' => $this->whenCounted('usages'),
            'is_active' => $this->is_active,
        ];
    }
}
