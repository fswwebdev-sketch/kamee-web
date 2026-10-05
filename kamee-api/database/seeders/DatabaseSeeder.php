<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $demo = (bool) config('kamee.seed_demo');

        $this->call(array_values(array_filter([
            LoyaltyTierSeeder::class,
            OutletSeeder::class,
            UserSeeder::class,
            CatalogSeeder::class,
            PromotionSeeder::class,
            ContentSeeder::class,
            // Data demo: pelanggan & pesanan contoh (KAMEE_SEED_DEMO=false untuk produksi).
            $demo ? CustomerSeeder::class : null,
            $demo ? DemoOrderSeeder::class : null,
            BookkeepingSeeder::class, // setelah pesanan demo: stok tidak dipotong mundur
        ])));
    }
}
