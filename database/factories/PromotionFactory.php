<?php

namespace Database\Factories;

use App\Enums\PromotionType;
use App\Models\Promotion;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Promotion> */
class PromotionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'code' => strtoupper(fake()->unique()->bothify('PROMO####')),
            'name' => 'Promo '.fake()->words(2, true),
            'type' => PromotionType::Percent,
            'value' => 10,
            'min_spend' => 0,
            'max_discount' => null,
            'quota' => null,
            'per_customer_limit' => null,
            'starts_at' => now()->subDay(),
            'ends_at' => now()->addMonth(),
            'outlet_id' => null,
            'is_active' => true,
        ];
    }

    public function percent(int $value, ?int $max = null): static
    {
        return $this->state(['type' => PromotionType::Percent, 'value' => $value, 'max_discount' => $max]);
    }

    public function fixed(int $value): static
    {
        return $this->state(['type' => PromotionType::Fixed, 'value' => $value]);
    }

    public function bogo(): static
    {
        return $this->state(['type' => PromotionType::Bogo, 'value' => 0]);
    }

    public function freeDelivery(): static
    {
        return $this->state(['type' => PromotionType::FreeDelivery, 'value' => 0]);
    }

    public function expired(): static
    {
        return $this->state(['starts_at' => now()->subMonth(), 'ends_at' => now()->subDay()]);
    }
}
