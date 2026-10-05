<?php

namespace Database\Factories;

use App\Enums\BlogStatus;
use App\Models\Blog;
use App\Models\BlogCategory;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Blog> */
class BlogFactory extends Factory
{
    public function definition(): array
    {
        return [
            'blog_category_id' => BlogCategory::factory(),
            'title' => fake()->unique()->sentence(5),
            'excerpt' => fake()->sentence(12),
            'content' => '<p>'.implode('</p><p>', fake()->paragraphs(4)).'</p>',
            'status' => BlogStatus::Published,
            'published_at' => now()->subDays(fake()->numberBetween(1, 30)),
        ];
    }

    public function draft(): static
    {
        return $this->state(['status' => BlogStatus::Draft, 'published_at' => null]);
    }
}
