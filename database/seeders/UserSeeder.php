<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\Outlet;
use App\Models\User;
use Illuminate\Database\Seeder;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::updateOrCreate(['email' => 'superadmin@kamee.id'], [
            'name' => 'Super Admin Kamee',
            'password' => 'password',
            'role' => UserRole::SuperAdmin,
            'outlet_id' => null,
            'is_active' => true,
        ]);

        User::updateOrCreate(['email' => 'admin.cikokol@kamee.id'], [
            'name' => 'Admin Kamee Cikokol',
            'password' => 'password',
            'role' => UserRole::OutletAdmin,
            'outlet_id' => Outlet::where('slug', 'kamee-cikokol')->value('id'),
            'is_active' => true,
        ]);
    }
}
