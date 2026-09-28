<?php

namespace Database\Factories;

use App\Models\LoyaltyTier;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<LoyaltyTier> */
class LoyaltyTierFactory extends Factory
{
    public function definition(): array
    {
        return ['name' => 'Bronze', 'min_spend' => 0, 'point_multiplier' => 1, 'perks' => []];
    }
}
