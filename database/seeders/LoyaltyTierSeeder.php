<?php

namespace Database\Seeders;

use App\Models\LoyaltyTier;
use Illuminate\Database\Seeder;

class LoyaltyTierSeeder extends Seeder
{
    public function run(): void
    {
        $tiers = [
            ['name' => 'Bronze', 'min_spend' => 0, 'point_multiplier' => 1.00, 'perks' => ['1 poin setiap belanja Rp10.000']],
            ['name' => 'Silver', 'min_spend' => 1_000_000, 'point_multiplier' => 1.25, 'perks' => ['Poin 1,25x', 'Voucher ulang tahun Rp15.000']],
            ['name' => 'Gold', 'min_spend' => 5_000_000, 'point_multiplier' => 1.50, 'perks' => ['Poin 1,5x', 'Gratis upsize setiap Jumat', 'Voucher ulang tahun Rp30.000']],
        ];

        foreach ($tiers as $tier) {
            LoyaltyTier::updateOrCreate(['name' => $tier['name']], $tier);
        }
    }
}
