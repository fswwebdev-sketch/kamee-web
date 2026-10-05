<?php

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Models\Product;
use App\Support\Media;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/*
| Endpoint tambahan untuk dashboard admin kamee-web:
| aksi massal produk, urutan galeri, ketersediaan per outlet di detail produk, dan laporan JSON.
*/

beforeEach(fn () => Storage::fake(Media::diskName()));

it('menjalankan aksi massal produk dan hanya untuk Super Admin', function () {
    $products = Product::factory()->count(3)->create(['is_active' => true]);
    $ids = $products->pluck('id')->all();

    actingAsAdmin(outletAdmin());
    $this->postJson('/api/v1/admin/products/bulk', ['ids' => $ids, 'action' => 'deactivate'])->assertForbidden();

    actingAsAdmin(superAdmin());
    $this->postJson('/api/v1/admin/products/bulk', ['ids' => $ids, 'action' => 'deactivate'])
        ->assertOk()->assertJsonPath('data.affected', 3)->assertJsonPath('message', '3 produk berhasil diperbarui.');
    expect(Product::query()->where('is_active', true)->count())->toBe(0);

    $this->postJson('/api/v1/admin/products/bulk', ['ids' => [$ids[0]], 'action' => 'feature'])->assertOk();
    expect($products[0]->fresh()->is_featured)->toBeTrue();

    $this->postJson('/api/v1/admin/products/bulk', ['ids' => [$ids[1], $ids[2]], 'action' => 'delete'])->assertOk();
    expect(Product::query()->count())->toBe(1)->and(Product::withTrashed()->count())->toBe(3);

    $this->postJson('/api/v1/admin/products/bulk', ['ids' => [], 'action' => 'hapus'])->assertJsonValidationErrors(['ids', 'action']);
});

it('mengurutkan ulang galeri produk', function () {
    actingAsAdmin(superAdmin());
    $product = Product::factory()->create();
    $ids = collect($this->post("/api/v1/admin/products/{$product->id}/images", [
        'images' => [UploadedFile::fake()->image('a.jpg'), UploadedFile::fake()->image('b.jpg'), UploadedFile::fake()->image('c.jpg')],
    ], ['Accept' => 'application/json'])->json('data'))->pluck('id');

    $order = [$ids[2], $ids[0], $ids[1]];
    $this->putJson("/api/v1/admin/products/{$product->id}/images/order", ['ids' => $order])
        ->assertOk()->assertJsonPath('data.0.id', $ids[2])->assertJsonPath('data.2.id', $ids[1]);
    expect($product->images()->pluck('id')->all())->toBe($order);

    // Harus berisi seluruh gambar galeri produk tersebut
    $this->putJson("/api/v1/admin/products/{$product->id}/images/order", ['ids' => [$ids[0]]])->assertStatus(422);
    $this->putJson("/api/v1/admin/products/{$product->id}/images/order", ['ids' => [$ids[0], $ids[1], 999]])->assertStatus(422);
});

it('menampilkan detail lengkap produk admin beserta outlet yang menandai habis', function () {
    actingAsAdmin(superAdmin());
    $a = outlet();
    $b = outlet();
    ['product' => $product] = drink(attributes: ['description' => 'Kopi susu gula aren', 'calories' => 180]);

    $this->patchJson("/api/v1/admin/outlets/{$b->id}/products/{$product->id}", ['is_available' => false])->assertOk();

    $this->getJson("/api/v1/admin/products/{$product->id}")->assertOk()
        ->assertJsonPath('data.description', 'Kopi susu gula aren')
        ->assertJsonPath('data.calories', 180)
        ->assertJsonPath('data.category_id', $product->category_id)
        ->assertJsonCount(3, 'data.option_group_ids')
        ->assertJsonPath('data.unavailable_outlet_ids', [$b->id]);

    $this->getJson('/api/v1/admin/products')->assertJsonPath('data.0.unavailable_outlet_ids', [$b->id]);

    $this->patchJson("/api/v1/admin/outlets/{$b->id}/products/{$product->id}", ['is_available' => true])->assertOk();
    $this->getJson("/api/v1/admin/products/{$product->id}")->assertJsonPath('data.unavailable_outlet_ids', []);
    expect($a->id)->not->toBe($b->id);
});

it('menyajikan laporan penjualan per hari, produk, outlet, dan metode bayar', function () {
    $this->travelTo(now()->setDate(2026, 9, 15)->setTime(12, 0));
    $cikokol = outlet(['name' => 'Cikokol']);
    $karawaci = outlet(['name' => 'Karawaci']);
    $kopi = snack(20000);

    $make = function ($outlet, int $total, PaymentMethod $method, string $when, OrderStatus $status = OrderStatus::Completed) use ($kopi) {
        $order = Order::factory()->status($status)->create(['outlet_id' => $outlet->id, 'total' => $total, 'created_at' => $when]);
        OrderItem::factory()->create(['order_id' => $order->id, 'product_id' => $kopi->id, 'product_name' => $kopi->name, 'qty' => intdiv($total, 20000), 'subtotal' => $total]);
        Payment::factory()->create(['order_id' => $order->id, 'method' => $method, 'amount' => $total, 'status' => PaymentStatus::Paid]);

        return $order;
    };
    $make($cikokol, 40000, PaymentMethod::Qris, '2026-09-10 09:00');
    $make($cikokol, 20000, PaymentMethod::Cash, '2026-09-10 15:00');
    $make($karawaci, 60000, PaymentMethod::Qris, '2026-09-12 10:00');
    $make($karawaci, 99000, PaymentMethod::Qris, '2026-09-12 11:00', OrderStatus::Cancelled); // tidak dihitung

    actingAsAdmin(superAdmin());
    $q = 'from=2026-09-10&to=2026-09-12';

    $day = $this->getJson("/api/v1/admin/reports/sales?{$q}&group_by=day")->assertOk()->json('data');
    expect($day['rows'])->toHaveCount(3)
        ->and($day['rows'][0])->toMatchArray(['key' => '2026-09-10', 'orders' => 2, 'revenue' => 60000])
        ->and($day['rows'][1]['revenue'])->toBe(0)
        ->and($day['totals'])->toBe(['orders' => 3, 'revenue' => 120000]);

    $this->getJson("/api/v1/admin/reports/sales?{$q}&group_by=product")
        ->assertJsonPath('data.rows.0.label', $kopi->name)->assertJsonPath('data.rows.0.qty', 6)->assertJsonPath('data.rows.0.share', 100);

    $this->getJson("/api/v1/admin/reports/sales?{$q}&group_by=outlet")
        ->assertJsonPath('data.rows.0.label', 'Cikokol')->assertJsonPath('data.rows.0.orders', 2)
        ->assertJsonPath('data.rows.1.label', 'Karawaci')->assertJsonPath('data.rows.1.revenue', 60000); // omzet seri → diurutkan menurut ID outlet

    $this->getJson("/api/v1/admin/reports/sales?{$q}&group_by=payment_method")
        ->assertJsonPath('data.rows.0.key', 'qris')->assertJsonPath('data.rows.0.label', PaymentMethod::Qris->label())
        ->assertJsonPath('data.rows.0.revenue', 100000)->assertJsonPath('data.rows.1.key', 'cash');

    $this->getJson("/api/v1/admin/reports/sales?{$q}&group_by=tahun")->assertJsonValidationErrors('group_by');

    // Admin Outlet selalu dikunci ke outletnya walau meminta outlet lain
    actingAsAdmin(outletAdmin($cikokol));
    $this->getJson("/api/v1/admin/reports/sales?{$q}&group_by=outlet&outlet_id={$karawaci->id}")
        ->assertJsonCount(1, 'data.rows')->assertJsonPath('data.rows.0.label', 'Cikokol');

    // Ekspor XLSX teragregasi
    $xlsx = $this->get("/api/v1/admin/reports/sales.xlsx?{$q}&group_by=product");
    $xlsx->assertOk();
    expect($xlsx->headers->get('content-disposition'))->toContain('laporan-product-20260910_20260912.xlsx')
        ->and(substr($xlsx->streamedContent(), 0, 2))->toBe('PK');
});
