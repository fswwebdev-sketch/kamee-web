<?php

namespace Database\Factories;

use App\Enums\LoyaltyTransactionType;
use App\Models\Customer;
use App\Models\LoyaltyTransaction;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<LoyaltyTransaction> */
class LoyaltyTransactionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'customer_id' => Customer::factory(),
            'type' => LoyaltyTransactionType::Earn,
            'points' => 10,
            'balance_after' => 10,
            'expires_at' => now()->addYear(),
        ];
    }
}
