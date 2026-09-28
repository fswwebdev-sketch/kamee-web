<?php

namespace Database\Seeders;

use App\Models\Outlet;
use Illuminate\Database\Seeder;

class OutletSeeder extends Seeder
{
    public function run(): void
    {
        $outlets = [
            [
                'name' => 'Kamee Coffee Cikokol',
                'slug' => 'kamee-cikokol',
                'address' => 'Jl. MH. Thamrin No. 8, Cikokol, Kec. Tangerang, Kota Tangerang, Banten 15117',
                'city' => 'Tangerang',
                'lat' => -6.2088100,
                'lng' => 106.6365200,
                'phone_wa' => '6281211110001',
                'open_time' => '07:00:00',
                'close_time' => '22:00:00',
                'delivery_radius_km' => 7,
            ],
            [
                'name' => 'Kamee Coffee Karawaci',
                'slug' => 'kamee-karawaci',
                'address' => 'Jl. Imam Bonjol No. 21, Karawaci, Kota Tangerang, Banten 15115',
                'city' => 'Tangerang',
                'lat' => -6.1918300,
                'lng' => 106.6101500,
                'phone_wa' => '6281211110002',
                'open_time' => '08:00:00',
                'close_time' => '23:00:00',
                'delivery_radius_km' => 6,
            ],
        ];

        foreach ($outlets as $outlet) {
            Outlet::updateOrCreate(['slug' => $outlet['slug']], $outlet + ['is_open' => true]);
        }
    }
}
