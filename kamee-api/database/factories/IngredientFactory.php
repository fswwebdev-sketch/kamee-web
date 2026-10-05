<?php

namespace Database\Factories;

use App\Enums\IngredientKind;
use App\Enums\IngredientUnit;
use App\Models\Ingredient;
use App\Models\Outlet;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Ingredient> */
class IngredientFactory extends Factory
{
    public function definition(): array
    {
        return [
            'outlet_id' => Outlet::factory(),
            'name' => ucfirst(fake()->unique()->words(2, true)),
            'kind' => IngredientKind::Bahan,
            'unit' => IngredientUnit::Ml,
            'pack_label' => '1 liter',
            'pack_size' => 1000,
            'pack_price' => 60000,
            'min_stock' => null,
            'note' => null,
            'is_active' => true,
        ];
    }

    public function packaging(): static
    {
        return $this->state([
            'kind' => IngredientKind::Kemasan, 'unit' => IngredientUnit::Pcs,
            'pack_label' => '1 pcs', 'pack_size' => 1, 'pack_price' => 1000,
        ]);
    }

    /** Set stok langsung (tanpa mutasi) — hanya untuk data uji. */
    public function stock(float $qty): static
    {
        return $this->afterCreating(function (Ingredient $ingredient) use ($qty) {
            $ingredient->forceFill(['stock_qty' => $qty])->save();
        });
    }
}
