<?php

use App\Enums\OrderStatus;
use App\Models\Customer;
use App\Models\CustomerAddress;
use App\Models\Order;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Contracts\Broadcasting\Broadcaster;
use Illuminate\Support\Facades\Http;

beforeEach(function () {
    $this->outletA = outlet(['name' => 'Kamee A']);
    $this->outletB = outlet(['name' => 'Kamee B']);
    $this->orderA = Order::factory()->status(OrderStatus::Paid)->create(['outlet_id' => $this->outletA->id]);
    $this->orderB = Order::factory()->status(OrderStatus::Paid)->create(['outlet_id' => $this->outletB->id]);
});

it('tamu tanpa token ditolak dengan 401', function (string $method, string $uri) {
    $this->json($method, $uri)->assertUnauthorized()->assertJsonPath('message', 'Sesi tidak valid atau Anda belum masuk.');
})->with([
    ['GET', '/api/v1/me'],
    ['GET', '/api/v1/admin/orders'],
    ['GET', '/api/v1/admin/dashboard/summary'],
]);

it('login admin mengembalikan token; kredensial salah dan akun nonaktif ditolak', function () {
    $admin = User::factory()->superAdmin()->create(['email' => 'boss@kamee.id']);
    User::factory()->superAdmin()->inactive()->create(['email' => 'off@kamee.id']);

    $this->postJson('/api/v1/admin/auth/login', ['email' => 'boss@kamee.id', 'password' => 'password'])
        ->assertOk()->assertJsonPath('data.user.role', 'super_admin')->assertJsonStructure(['data' => ['token']]);
    expect($admin->fresh()->last_login_at)->not->toBeNull();

    $this->postJson('/api/v1/admin/auth/login', ['email' => 'boss@kamee.id', 'password' => 'salah'])
        ->assertUnprocessable()->assertJsonPath('message', 'Email atau kata sandi salah.');
    $this->postJson('/api/v1/admin/auth/login', ['email' => 'off@kamee.id', 'password' => 'password'])->assertForbidden();
});

it('admin nonaktif yang masih memegang token ditolak', function () {
    actingAsAdmin(User::factory()->outletAdmin($this->outletA)->inactive()->create());

    $this->getJson('/api/v1/admin/orders')->assertForbidden()->assertJsonPath('message', 'Akun Anda dinonaktifkan. Hubungi Super Admin.');
});

it('token pelanggan tidak bisa mengakses admin, dan token admin tidak bisa mengakses /me', function () {
    actingAsCustomer();
    $this->getJson('/api/v1/admin/orders')->assertForbidden()->assertJsonPath('message', 'Endpoint ini khusus admin.');

    actingAsAdmin(superAdmin());
    $this->getJson('/api/v1/me')->assertForbidden();
});

it('Admin Outlet hanya melihat pesanan outlet miliknya', function () {
    actingAsAdmin(outletAdmin($this->outletA));

    $this->getJson('/api/v1/admin/orders')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.id', $this->orderA->id);
    $this->getJson('/api/v1/admin/orders?filter[outlet_id]='.$this->outletB->id)->assertOk()->assertJsonCount(0, 'data');
    $this->getJson("/api/v1/admin/orders/{$this->orderA->id}")->assertOk();
    $this->getJson("/api/v1/admin/orders/{$this->orderB->id}")->assertNotFound();
    $this->patchJson("/api/v1/admin/orders/{$this->orderB->id}/status", ['status' => 'processing'])->assertNotFound();
});

it('Super Admin melihat semua outlet dan dapat memfilter', function () {
    actingAsAdmin(superAdmin());

    $this->getJson('/api/v1/admin/orders')->assertOk()->assertJsonPath('meta.total', 2);
    $this->getJson('/api/v1/admin/orders?filter[outlet_id]='.$this->outletB->id)->assertJsonPath('meta.total', 1);
    $this->getJson("/api/v1/admin/orders/{$this->orderB->id}")->assertOk()->assertJsonStructure(['data' => ['status_logs', 'payments']]);
});

it('Policy menolak Admin Outlet mengubah pesanan outlet lain walau scope dilewati', function () {
    $admin = outletAdmin($this->outletA);

    expect($admin->can('updateStatus', $this->orderB))->toBeFalse()
        ->and($admin->can('updateStatus', $this->orderA))->toBeTrue()
        ->and(superAdmin()->can('updateStatus', $this->orderB))->toBeTrue();
});

it('Admin Outlet dapat memproses pesanan outletnya', function () {
    actingAsAdmin(outletAdmin($this->outletA));

    $this->patchJson("/api/v1/admin/orders/{$this->orderA->id}/status", ['status' => 'processing', 'note' => 'Diracik'])
        ->assertOk()->assertJsonPath('data.status', 'processing')->assertJsonPath('message', 'Status pesanan diperbarui menjadi "Sedang diproses".');

    $this->patchJson("/api/v1/admin/orders/{$this->orderA->id}/status", ['status' => 'shipped'])
        ->assertUnprocessable()->assertJsonPath('message', 'Hanya pesanan antar yang dapat diubah ke status dikirim.');

    $this->patchJson("/api/v1/admin/orders/{$this->orderA->id}/status", ['status' => 'cancelled'])
        ->assertJsonValidationErrors(['note' => 'Alasan pembatalan wajib diisi.']);
});

it('endpoint khusus Super Admin menolak Admin Outlet (403)', function (string $method, string $uri, array $body = []) {
    actingAsAdmin(outletAdmin($this->outletA));

    $uri = str_replace(['{order}', '{customer}'], [$this->orderA->id, customer()->id], $uri);

    $this->json($method, $uri, $body)->assertForbidden()->assertJsonPath('message', 'Anda tidak memiliki akses untuk tindakan ini.');
})->with([
    'refund' => ['POST', '/api/v1/admin/orders/{order}/refund', ['reason' => 'x']],
    'tambah produk' => ['POST', '/api/v1/admin/products', ['name' => 'X', 'category_id' => 1, 'base_price' => 1000]],
    'tambah kategori' => ['POST', '/api/v1/admin/categories', ['name' => 'X']],
    'tambah grup opsi' => ['POST', '/api/v1/admin/option-groups', ['name' => 'X', 'type' => 'single', 'options' => [['name' => 'A', 'price_delta' => 0]]]],
    'tambah promo' => ['POST', '/api/v1/admin/promotions', ['name' => 'X', 'type' => 'fixed', 'value' => 1]],
    'tambah banner' => ['POST', '/api/v1/admin/banners', ['title' => 'X', 'image_desktop' => 'x.jpg']],
    'tambah blog' => ['POST', '/api/v1/admin/blogs', ['title' => 'X', 'content' => 'Y']],
    'tambah outlet' => ['POST', '/api/v1/admin/outlets', ['name' => 'X', 'address' => 'Y', 'city' => 'Z', 'lat' => 0, 'lng' => 0, 'phone_wa' => '0812345678']],
    'daftar pengguna' => ['GET', '/api/v1/admin/users'],
    'koreksi poin' => ['POST', '/api/v1/admin/customers/{customer}/points-adjust', ['points' => 5, 'note' => 'x']],
    'lihat pengaturan' => ['GET', '/api/v1/admin/settings'],
    'ubah pengaturan' => ['PUT', '/api/v1/admin/settings', ['service_fee' => 1000]],
]);

it('Admin Outlet hanya bisa menandai stok habis di outlet miliknya', function () {
    $product = snack();
    actingAsAdmin(outletAdmin($this->outletA));

    $this->patchJson("/api/v1/admin/outlets/{$this->outletA->id}/products/{$product->id}", ['is_available' => false])
        ->assertOk()->assertJsonPath('data.is_available', false);
    $this->patchJson("/api/v1/admin/outlets/{$this->outletB->id}/products/{$product->id}", ['is_available' => false])
        ->assertForbidden();

    expect($this->outletA->isProductAvailable($product->id))->toBeFalse()
        ->and($this->outletB->isProductAvailable($product->id))->toBeTrue();
});

it('dashboard & laporan Admin Outlet dikunci ke outletnya', function () {
    actingAsAdmin(outletAdmin($this->outletA));

    $this->getJson('/api/v1/admin/dashboard/summary?outlet_id='.$this->outletB->id)
        ->assertOk()->assertJsonPath('data.paid_orders', 1)->assertJsonPath('data.revenue', $this->orderA->total);
});

it('Super Admin dapat me-refund pesanan yang sudah dibayar', function () {
    Http::fake(['*/refund' => Http::response(['status_code' => '200'])]);
    Payment::factory()->create(['order_id' => $this->orderA->id, 'status' => 'paid', 'amount' => $this->orderA->total]);
    actingAsAdmin(superAdmin());

    $this->postJson("/api/v1/admin/orders/{$this->orderA->id}/refund", ['reason' => 'Stok habis'])
        ->assertOk()->assertJsonPath('data.status', 'cancelled')->assertJsonPath('data.cancelled_reason', 'Refund: Stok habis')
        ->assertJsonPath('data.payments.0.status', 'refunded');

    $this->postJson("/api/v1/admin/orders/{$this->orderB->id}/refund", ['reason' => 'x'])
        ->assertUnprocessable()->assertJsonPath('message', 'Tidak ada pembayaran lunas yang bisa direfund.');
});

it('refund gagal bila ditolak gateway', function () {
    Http::fake(['*/refund' => Http::response(['status_code' => '412', 'status_message' => 'Merchant cannot modify'])]);
    Payment::factory()->create(['order_id' => $this->orderA->id, 'status' => 'paid', 'amount' => $this->orderA->total]);
    actingAsAdmin(superAdmin());

    $this->postJson("/api/v1/admin/orders/{$this->orderA->id}/refund", ['reason' => 'x'])->assertStatus(502);
    expect($this->orderA->fresh()->status)->toBe(OrderStatus::Paid);
});

it('pelanggan hanya dapat mengelola alamatnya sendiri', function () {
    $other = CustomerAddress::factory()->create();
    actingAsCustomer();

    $this->getJson("/api/v1/me/addresses/{$other->id}")->assertForbidden();
    $this->patchJson("/api/v1/me/addresses/{$other->id}", ['label' => 'X'])->assertForbidden();
    $this->deleteJson("/api/v1/me/addresses/{$other->id}")->assertForbidden();
});

it('pelanggan hanya melihat pesanannya sendiri', function () {
    $me = actingAsCustomer();
    $mine = Order::factory()->create(['customer_id' => $me->id]);
    $theirs = Order::factory()->create(['customer_id' => Customer::factory()->create()->id]);

    $this->getJson('/api/v1/me/orders')->assertOk()->assertJsonCount(1, 'data');
    $this->getJson("/api/v1/me/orders/{$mine->code}")->assertOk();
    $this->getJson("/api/v1/me/orders/{$theirs->code}")->assertNotFound();
});

it('channel broadcast privat memeriksa kepemilikan outlet & pesanan', function () {
    $channels = app(Broadcaster::class)->getChannels();
    $outletChannel = $channels['outlet.{outletId}'];
    $orderChannel = $channels['order.{code}'];
    $admin = outletAdmin($this->outletA);
    $owner = customer();
    $this->orderA->update(['customer_id' => $owner->id]);

    expect($outletChannel($admin, $this->outletA->id))->toBeTrue()
        ->and($outletChannel($admin, $this->outletB->id))->toBeFalse()
        ->and($outletChannel($owner, $this->outletA->id))->toBeFalse()
        ->and($orderChannel($owner, $this->orderA->code))->toBeTrue()
        ->and($orderChannel(customer(), $this->orderA->code))->toBeFalse()
        ->and($orderChannel($admin, $this->orderA->code))->toBeTrue()
        ->and($orderChannel($admin, $this->orderB->code))->toBeFalse()
        ->and($orderChannel($admin, 'TIDAKADA'))->toBeFalse();
});
