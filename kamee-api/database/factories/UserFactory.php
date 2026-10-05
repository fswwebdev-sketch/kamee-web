<?php

namespace Database\Factories;

use App\Enums\UserRole;
use App\Models\Outlet;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/** @extends Factory<User> */
class UserFactory extends Factory
{
    protected static ?string $password;

    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'password' => static::$password ??= Hash::make('password'),
            'role' => UserRole::OutletAdmin,
            'outlet_id' => Outlet::factory(),
            'is_active' => true,
            'remember_token' => Str::random(10),
        ];
    }

    public function superAdmin(): static
    {
        return $this->state(['role' => UserRole::SuperAdmin, 'outlet_id' => null]);
    }

    public function outletAdmin(Outlet|int|null $outlet = null): static
    {
        return $this->state([
            'role' => UserRole::OutletAdmin,
            'outlet_id' => $outlet instanceof Outlet ? $outlet->id : ($outlet ?? Outlet::factory()),
        ]);
    }

    public function inactive(): static
    {
        return $this->state(['is_active' => false]);
    }
}
