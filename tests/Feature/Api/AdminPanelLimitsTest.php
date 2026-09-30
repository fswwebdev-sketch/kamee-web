<?php

use App\Models\Order;

/*
| Kebutuhan dashboard admin (kamee-web): limiter sendiri & data detail pelanggan.
*/

it('memakai limiter admin (bukan limiter publik 60/menit) untuk panel admin', function () {
    config(['kamee.admin_rate_limit' => 80]);
    actingAsAdmin(superAdmin()->fresh());

    for ($i = 0; $i < 70; $i++) {
        $this->getJson('/api/v1/admin/auth/me')->assertOk();
    }

    for ($i = 0; $i < 10; $i++) {
        $this->getJson('/api/v1/admin/auth/me');
    }
    $this->getJson('/api/v1/admin/auth/me')->assertStatus(429);
});

it('menyertakan outlet pada riwayat pembelian & tanggal ISO pada statistik pelanggan', function () {
    $customer = customer();
    $outlet = outlet();
    Order::factory()->for($outlet)->create(['customer_id' => $customer->id]);
    actingAsAdmin(superAdmin());

    $res = $this->getJson("/api/v1/admin/customers/{$customer->id}")->assertOk();

    expect($res->json('recent_orders.0.outlet.name'))->toBe($outlet->name)
        ->and($res->json('data.stats.last_order_at'))->toMatch('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/');
});
