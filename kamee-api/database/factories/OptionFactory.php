<?php

namespace Database\Factories;

use App\Models\Option;
use App\Models\OptionGroup;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Option> */
class OptionFactory extends Factory
{
    public function definition(): array
    {
        return [
            'option_group_id' => OptionGroup::factory(),
            'name' => fake()->word(),
            'price_delta' => 0,
            'sort_order' => 0,
        ];
    }
}
