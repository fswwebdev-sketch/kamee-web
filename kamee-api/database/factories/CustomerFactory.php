<?php

namespace Database\Factories;

use App\Models\Customer;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Customer> */
class CustomerFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'phone_wa' => '628'.fake()->unique()->numerify('##########'),
            'email' => fake()->optional()->safeEmail(),
            'birth_date' => fake()->optional()->dateTimeBetween('-45 years', '-17 years'),
        ];
    }
}
