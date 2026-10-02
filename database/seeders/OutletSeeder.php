<?php

namespace Database\Seeders;

use App\Models\Outlet;
use Illuminate\Database\Seeder;

/** Kamee Coffee hanya punya satu outlet: Taman Cibodas, Kota Tangerang. */
class OutletSeeder extends Seeder
{
    public const SLUG = 'kamee-taman-cibodas';

    public function run(): void
    {
        Outlet::unguarded(fn () => Outlet::updateOrCreate(['id' => 1], [
            'slug' => self::SLUG,
            'name' => 'Kamee Coffee Taman Cibodas',
            'address' => 'Jl. Cempaka Raya Blok I6 No. 3, Perumahan Taman Cibodas, Sangiang Jaya, Kec. Periuk',
            'city' => 'Kota Tangerang',
            'lat' => -6.1819389,
            'lng' => 106.5971757,
            'phone_wa' => '6281280871630',
            'open_time' => '10:00:00',
            'close_time' => '17:00:00',
            'delivery_radius_km' => 5,
            'is_open' => true,
        ]));
    }
}
