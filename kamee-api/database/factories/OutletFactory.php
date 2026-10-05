<?php

namespace Database\Factories;

use App\Models\Outlet;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Outlet> */
class OutletFactory extends Factory
{
    public function definition(): array
    {
        return [
            'name' => 'Kamee '.fake()->unique()->streetName(),
            'address' => fake()->streetAddress(),
            'city' => 'Tangerang',
            'lat' => -6.1783 + fake()->randomFloat(4, -0.02, 0.02),
            'lng' => 106.6319 + fake()->randomFloat(4, -0.02, 0.02),
            'phone_wa' => '62812'.fake()->numerify('#######'),
            'open_time' => '07:00:00',
            'close_time' => '22:00:00',
            'is_open' => true,
            'delivery_radius_km' => 7,
        ];
    }

    public function closed(): static
    {
        return $this->state(['is_open' => false]);
    }
}
