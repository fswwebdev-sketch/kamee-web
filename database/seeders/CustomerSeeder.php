<?php

namespace Database\Seeders;

use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\LoyaltyTier;
use Illuminate\Database\Seeder;

class CustomerSeeder extends Seeder
{
    public function run(): void
    {
        $bronze = LoyaltyTier::orderBy('min_spend')->value('id');

        $names = [
            'Dinda Putri', 'Rizky Pratama', 'Ayu Lestari', 'Bagas Saputra', 'Citra Maharani', 'Dimas Hidayat',
            'Eka Wulandari', 'Fajar Nugroho', 'Gita Permata', 'Hendra Wijaya', 'Indah Sari', 'Joko Susilo',
            'Kartika Dewi', 'Lukman Hakim', 'Maya Anggraini', 'Nanda Kurniawan', 'Oktaviani Rahma', 'Putra Ramadhan',
            'Rina Marlina', 'Satria Adi',
        ];

        foreach ($names as $i => $name) {
            $customer = Customer::firstOrCreate(
                ['phone_wa' => '62812'.str_pad((string) (3000000 + $i * 7919), 8, '0', STR_PAD_LEFT)],
                [
                    'name' => $name,
                    'email' => strtolower(str_replace(' ', '.', $name)).'@example.com',
                    'birth_date' => now()->subYears(20 + $i % 15)->subDays($i * 11)->toDateString(),
                    'tier_id' => $bronze,
                ],
            );

            if ($customer->wasRecentlyCreated) {
                $customer->forceFill(['created_at' => now()->subDays(90 - $i * 2)])->saveQuietly();
            }

            if ($customer->addresses()->doesntExist()) {
                CustomerAddress::factory()->for($customer)->create([
                    'label' => 'Rumah',
                    'is_default' => true,
                    'lat' => -6.200 + ($i % 5) * 0.004,
                    'lng' => 106.625 + ($i % 4) * 0.004,
                ]);
            }
        }
    }
}
