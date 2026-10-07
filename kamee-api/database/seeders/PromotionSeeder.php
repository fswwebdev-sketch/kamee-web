<?php

namespace Database\Seeders;

use App\Enums\PromotionType;
use App\Models\Promotion;
use Illuminate\Database\Seeder;

class PromotionSeeder extends Seeder
{
    public function run(): void
    {
        $start = now()->subDays(90);
        $end = now()->addDays(60);

        $promotions = [
            // Promo aman margin (Okt 2026): potongan maks ±8% dari minimal belanja; margin cup terendah ±24%.
            ['code' => 'KAMEEHEMAT', 'name' => 'Hemat 5% (maks Rp7.500) min. belanja Rp50.000', 'type' => PromotionType::Percent, 'value' => 5, 'min_spend' => 50000, 'max_discount' => 7500, 'quota' => 300, 'per_customer_limit' => 3],
            ['code' => 'NGOPI10K', 'name' => 'Potongan Rp10.000 min. belanja Rp125.000', 'type' => PromotionType::Fixed, 'value' => 10000, 'min_spend' => 125000, 'max_discount' => null, 'quota' => 200, 'per_customer_limit' => 2],
            ['code' => 'KENALAN', 'name' => 'Potongan Rp3.000 min. belanja Rp36.000 (1x per pelanggan)', 'type' => PromotionType::Fixed, 'value' => 3000, 'min_spend' => 36000, 'max_discount' => null, 'quota' => 200, 'per_customer_limit' => 1],
            // Nonaktif: gratis 1 minuman (rugi — HPP > margin) & gratis ongkir (ongkir ojol dibayar ke driver).
            ['code' => 'GRATISONGKIR', 'name' => 'Gratis ongkir min. belanja Rp50.000', 'type' => PromotionType::FreeDelivery, 'value' => 0, 'min_spend' => 50000, 'max_discount' => 15000, 'quota' => null, 'per_customer_limit' => 5, 'is_active' => false],
            ['code' => 'BELI1GRATIS1', 'name' => 'Beli 1 Gratis 1 (minuman yang sama)', 'type' => PromotionType::Bogo, 'value' => 0, 'min_spend' => 0, 'max_discount' => 35000, 'quota' => 100, 'per_customer_limit' => 1, 'is_active' => false],
        ];

        foreach ($promotions as $promotion) {
            Promotion::updateOrCreate(['code' => $promotion['code']], $promotion + [
                'starts_at' => $start, 'ends_at' => $end, 'is_active' => true, 'outlet_id' => null,
            ]);
        }
    }
}
