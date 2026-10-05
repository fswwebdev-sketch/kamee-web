<?php

use App\Models\Order;
use App\Models\Outlet;
use App\Models\User;

beforeEach(fn () => config(['kamee.cron_secret' => 'rahasia-setup', 'kamee.setup_enabled' => true]));

it('menolak tanpa rahasia yang benar', function () {
    $this->getJson('/api/v1/internal/setup')->assertUnauthorized();
    $this->getJson('/api/v1/internal/setup?key=salah')->assertUnauthorized();
});

it('bisa dimatikan lewat konfigurasi', function () {
    config(['kamee.setup_enabled' => false]);
    $this->getJson('/api/v1/internal/setup?key=rahasia-setup')->assertUnauthorized();
});

it('mengisi data awal tanpa demo saat database kosong, lalu idempoten', function () {
    config(['kamee.admin_email' => 'pemilik@example.com']);

    $this->getJson('/api/v1/internal/setup?key=rahasia-setup')
        ->assertOk()
        ->assertJsonPath('steps.seed', 'Data awal diisi (tanpa data demo).');

    expect(User::where('email', 'pemilik@example.com')->exists())->toBeTrue()
        ->and(Outlet::count())->toBe(1)
        ->and(Order::count())->toBe(0);

    $this->getJson('/api/v1/internal/setup/rahasia-setup')
        ->assertOk()
        ->assertJsonPath('steps.seed', 'Dilewati: data sudah ada.');

    $this->withHeader('X-Cron-Secret', 'rahasia-setup')->postJson('/api/v1/internal/setup')
        ->assertOk()
        ->assertJsonPath('steps.seed', 'Dilewati: data sudah ada.');
});
