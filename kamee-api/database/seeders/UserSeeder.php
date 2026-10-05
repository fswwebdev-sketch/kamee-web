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
        User::updateOrCreate(['email' => config('kamee.admin_email')], [
            'name' => 'Super Admin Kamee',
            'password' => 'password',
            'role' => UserRole::SuperAdmin,
            'outlet_id' => null,
            'is_active' => true,
        ]);

        User::updateOrCreate(['email' => 'admin.cibodas@kamee.id'], [
            'name' => 'Admin Kamee Taman Cibodas',
            'password' => 'password',
            'role' => UserRole::OutletAdmin,
            'outlet_id' => Outlet::where('slug', OutletSeeder::SLUG)->value('id'),
            'is_active' => true,
        ]);
    }
}
