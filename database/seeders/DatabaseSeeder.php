<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            LoyaltyTierSeeder::class,
            OutletSeeder::class,
            UserSeeder::class,
            CatalogSeeder::class,
            PromotionSeeder::class,
            ContentSeeder::class,
            CustomerSeeder::class,
            DemoOrderSeeder::class,
        ]);
    }
}
