<?php

namespace Database\Factories;

use App\Enums\CashCategory;
use App\Enums\CashEntryType;
use App\Enums\PaymentMethod;
use App\Models\CashEntry;
use App\Models\Outlet;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<CashEntry> */
class CashEntryFactory extends Factory
{
    public function definition(): array
    {
        return [
            'outlet_id' => Outlet::factory(),
            'date' => now()->toDateString(),
            'type' => CashEntryType::Expense,
            'category' => CashCategory::Operasional,
            'description' => fake()->sentence(3),
            'amount' => fake()->numberBetween(1, 50) * 1000,
            'method' => PaymentMethod::Cash,
            'source' => 'manual',
        ];
    }

    public function income(CashCategory $category = CashCategory::Penjualan): static
    {
        return $this->state(['type' => CashEntryType::Income, 'category' => $category]);
    }

    public function expense(CashCategory $category = CashCategory::Operasional): static
    {
        return $this->state(['type' => CashEntryType::Expense, 'category' => $category]);
    }
}
