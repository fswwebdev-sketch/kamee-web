<?php

namespace App\Http\Resources;

use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Customer */
class CustomerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'phone_wa' => $this->phone_wa,
            'email' => $this->email,
            'birth_date' => $this->birth_date?->toDateString(),
            'points_balance' => $this->points_balance,
            'lifetime_spend' => $this->lifetime_spend,
            'tier' => new LoyaltyTierResource($this->whenLoaded('tier')),
            'referral_code' => $this->referral_code,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
