<?php

namespace Database\Factories;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Product> */
class ProductFactory extends Factory
{
    public function definition(): array
    {
        return [
            'category_id' => Category::factory(),
            'name' => ucwords(fake()->unique()->words(3, true)),
            'short_description' => fake()->sentence(),
            'description' => fake()->paragraph(),
            'composition' => 'Espresso, susu segar, gula aren',
            'calories' => fake()->numberBetween(80, 450),
            'base_price' => fake()->randomElement([18000, 22000, 25000, 28000, 32000]),
            'image' => null,
            'is_featured' => false,
            'is_best_seller' => false,
            'is_active' => true,
        ];
    }

    public function price(int $price): static
    {
        return $this->state(['base_price' => $price]);
    }

    public function inactive(): static
    {
        return $this->state(['is_active' => false]);
    }
}
