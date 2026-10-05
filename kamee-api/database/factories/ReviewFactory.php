<?php

namespace Database\Factories;

use App\Models\Customer;
use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Review> */
class ReviewFactory extends Factory
{
    public function definition(): array
    {
        return [
            'product_id' => Product::factory(),
            'customer_id' => Customer::factory(),
            'order_id' => Order::factory(),
            'rating' => fake()->numberBetween(3, 5),
            'comment' => fake()->randomElement([
                'Kopinya enak banget, pas manisnya!', 'Pengiriman cepat, masih dingin sampai rumah.',
                'Aroma kopinya mantap, bakal pesan lagi.', 'Rasanya konsisten, favorit saya.',
                'Harga sepadan dengan rasa.', 'Es kopi susunya juara!',
            ]),
            'is_published' => true,
        ];
    }
}
