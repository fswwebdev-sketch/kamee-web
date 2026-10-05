<?php

namespace Database\Factories;

use App\Enums\OptionGroupType;
use App\Models\OptionGroup;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<OptionGroup> */
class OptionGroupFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->randomElement(['Ukuran', 'Gula', 'Es', 'Topping']),
            'type' => OptionGroupType::Single,
            'is_required' => false,
        ];
    }

    public function multi(): static
    {
        return $this->state(['type' => OptionGroupType::Multi]);
    }

    public function required(): static
    {
        return $this->state(['is_required' => true]);
    }
}
