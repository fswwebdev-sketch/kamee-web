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
            ['code' => 'KAMEEHEMAT', 'name' => 'Hemat 20% (maks Rp15.000)', 'type' => PromotionType::Percent, 'value' => 20, 'min_spend' => 40000, 'max_discount' => 15000, 'quota' => 500, 'per_customer_limit' => 3],
            ['code' => 'GRATISONGKIR', 'name' => 'Gratis ongkir min. belanja Rp50.000', 'type' => PromotionType::FreeDelivery, 'value' => 0, 'min_spend' => 50000, 'max_discount' => 15000, 'quota' => null, 'per_customer_limit' => 5],
            ['code' => 'BELI1GRATIS1', 'name' => 'Beli 1 Gratis 1 (minuman yang sama)', 'type' => PromotionType::Bogo, 'value' => 0, 'min_spend' => 0, 'max_discount' => 35000, 'quota' => 100, 'per_customer_limit' => 1],
            ['code' => 'NGOPI10K', 'name' => 'Potongan Rp10.000 min. belanja Rp75.000', 'type' => PromotionType::Fixed, 'value' => 10000, 'min_spend' => 75000, 'max_discount' => null, 'quota' => null, 'per_customer_limit' => 2],
        ];

        foreach ($promotions as $promotion) {
            Promotion::updateOrCreate(['code' => $promotion['code']], $promotion + [
                'starts_at' => $start, 'ends_at' => $end, 'is_active' => true, 'outlet_id' => null,
            ]);
        }
    }
}
