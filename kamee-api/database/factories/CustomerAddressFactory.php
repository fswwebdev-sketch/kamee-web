<?php

namespace Database\Factories;

use App\Models\Customer;
use App\Models\CustomerAddress;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<CustomerAddress> */
class CustomerAddressFactory extends Factory
{
    public function definition(): array
    {
        return [
            'customer_id' => Customer::factory(),
            'label' => fake()->randomElement(['Rumah', 'Kantor', 'Kos']),
            'address' => fake()->streetAddress().', Tangerang',
            'lat' => -6.18 + fake()->randomFloat(4, -0.03, 0.03),
            'lng' => 106.63 + fake()->randomFloat(4, -0.03, 0.03),
            'note' => null,
            'is_default' => false,
        ];
    }
}
