<?php

namespace Database\Factories;

use App\Models\Banner;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Banner> */
class BannerFactory extends Factory
{
    public function definition(): array
    {
        return [
            'title' => fake()->sentence(3),
            'subtitle' => fake()->sentence(6),
            'image_desktop' => 'banners/desktop.jpg',
            'image_mobile' => 'banners/mobile.jpg',
            'link_url' => '/menu',
            'placement' => 'home',
            'sort_order' => 0,
            'starts_at' => now()->subDay(),
            'ends_at' => now()->addMonth(),
            'is_active' => true,
        ];
    }
}
