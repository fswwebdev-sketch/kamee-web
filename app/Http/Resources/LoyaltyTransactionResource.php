<?php

namespace App\Http\Resources;

use App\Models\LoyaltyTransaction;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin LoyaltyTransaction */
class LoyaltyTransactionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'type' => $this->type->value,
            'type_label' => $this->type->label(),
            'points' => $this->points,
            'balance_after' => $this->balance_after,
            'order_code' => $this->whenLoaded('order', fn () => $this->order?->code),
            'note' => $this->note,
            'expires_at' => $this->expires_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
