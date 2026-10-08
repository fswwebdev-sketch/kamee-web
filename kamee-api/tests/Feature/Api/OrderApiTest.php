<?php

use App\Enums\OrderStatus;
use App\Events\OrderCreated;
use App\Models\Order;
use App\Models\Promotion;
use Illuminate\Support\Facades\Event;

beforeEach(function () {
    $this->outlet = outlet();
    $this->drink = drink(22000);
});

function items(array $drink, int $qty = 2): array
{
    return [['product_id' => $drink['product']->id, 'qty' => $qty, 'option_ids' => [$drink['large'], $drink['shot']], 'note' => 'less ice']];
}

it('membuat pesanan tamu dengan harga dihitung ulang di server', function () {
    Event::fake([OrderCreated::class]);

    $payload = orderPayload($this->outlet, items($this->drink)) + ['subtotal' => 1, 'total' => 1];
    $payload['items'][0]['unit_price'] = 1;

    $response = $this->postJson('/api/v1/orders', $payload, idem())->assertCreated();

    $response->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.subtotal', 66000)
        ->assertJsonPath('data.total', 66000)
        ->assertJsonPath('data.customer_phone', '6281234567890')
        ->assertJsonPath('data.items.0.unit_price', 33000)
        ->assertJsonPath('data.items.0.options.0.name', 'Ukuran: Large')
        ->assertJsonPath('data.timeline.0.status', 'pending')
        ->assertJsonPath('message', 'Pesanan berhasil dibuat. Silakan lanjutkan pembayaran.');

    Event::assertDispatched(OrderCreated::class, fn ($e) => $e->broadcastAs() === 'order.created'
        && collect($e->broadcastOn())->map->name->contains("private-outlet.{$this->outlet->id}"));
    expect(whatsapp()->lastTo('6281234567890'))->toContain('sudah kami terima');
});

it('mewajibkan header Idempotency-Key', function () {
    $this->postJson('/api/v1/orders', orderPayload($this->outlet, items($this->drink)))
        ->assertUnprocessable()
        ->assertJsonPath('errors.Idempotency-Key.0', 'Header Idempotency-Key wajib diisi.');
});

it('tidak membuat pesanan ganda untuk Idempotency-Key yang sama', function () {
    $payload = orderPayload($this->outlet, items($this->drink));
    $first = $this->postJson('/api/v1/orders', $payload, idem('order-abc'))->assertCreated();
    $second = $this->postJson('/api/v1/orders', $payload, idem('order-abc'))->assertCreated();

    $second->assertHeader('Idempotent-Replayed', 'true');
    expect($second->json('data.code'))->toBe($first->json('data.code'))
        ->and(Order::count())->toBe(1);

    $this->postJson('/api/v1/orders', orderPayload($this->outlet, items($this->drink, 1)), idem('order-abc'))
        ->assertUnprocessable()->assertJsonPath('message', 'Idempotency-Key sudah dipakai untuk permintaan dengan isi berbeda.');
});

it('memvalidasi payload dengan pesan berbahasa Indonesia', function () {
    $this->postJson('/api/v1/orders', ['fulfillment' => 'delivery', 'items' => []], idem())
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['outlet_id', 'customer', 'items', 'address'])
        ->assertJsonPath('errors.outlet_id.0', 'Outlet wajib diisi.');

    $this->postJson('/api/v1/orders', orderPayload($this->outlet, items($this->drink), ['customer' => ['phone' => '12']]), idem())
        ->assertJsonValidationErrors(['customer.phone' => 'Nomor WhatsApp tidak valid. Gunakan format 08xx atau 628xx.']);
});

it('mode ojol: pesanan kirim via ojol tanpa alamat, tanpa ongkir & tanpa batas radius', function () {
    config(['kamee.settings.delivery_mode' => 'ojol']);

    $this->postJson('/api/v1/orders', orderPayload($this->outlet, items($this->drink), ['fulfillment' => 'delivery']), idem())
        ->assertCreated()
        ->assertJsonPath('data.fulfillment', 'delivery')
        ->assertJsonPath('data.delivery_fee', 0)
        ->assertJsonPath('data.address', null);
});

it('membuat pesanan antar dengan ongkir, voucher, dan catatan alamat', function () {
    Promotion::factory()->percent(20, 15000)->create(['code' => 'KAMEEHEMAT', 'min_spend' => 40000]);

    $this->postJson('/api/v1/orders', orderPayload($this->outlet, items($this->drink), [
        'fulfillment' => 'delivery',
        'address' => ['text' => 'Jl. Merdeka 10', 'lat' => -6.2100, 'lng' => 106.6400, 'note' => 'Pagar hitam'],
        'promo_code' => 'KAMEEHEMAT',
    ]), idem())
        ->assertCreated()
        ->assertJsonPath('data.delivery_fee', 8000)
        ->assertJsonPath('data.discount', 13200)
        ->assertJsonPath('data.total', 66000 - 13200 + 8000)
        ->assertJsonPath('data.address', 'Jl. Merdeka 10 (Pagar hitam)');

    expect(Order::first()->promotionUsages()->count())->toBe(1);
});

it('member dapat menukar poin saat checkout', function () {
    $member = actingAsCustomer();
    $member->forceFill(['points_balance' => 200])->save();

    $this->postJson('/api/v1/orders', orderPayload($this->outlet, items($this->drink), ['redeem_points' => 100]), idem())
        ->assertCreated()
        ->assertJsonPath('data.points_redeemed', 100)
        ->assertJsonPath('data.points_discount', 10000)
        ->assertJsonPath('data.total', 56000);

    expect($member->fresh()->points_balance)->toBe(100)
        ->and(Order::first()->customer_id)->toBe($member->id);
});

it('mengaitkan pesanan tamu ke pelanggan terdaftar lewat nomor WA', function () {
    $member = customer(['phone_wa' => '6281234567890']);

    $this->postJson('/api/v1/orders', orderPayload($this->outlet, items($this->drink)), idem())->assertCreated();

    expect(Order::first()->customer_id)->toBe($member->id);
});

it('menolak pesanan saat outlet tutup atau di luar jam operasional', function () {
    $closed = outlet(['is_open' => false]);
    $this->postJson('/api/v1/orders', orderPayload($closed, items($this->drink)), idem())
        ->assertUnprocessable()->assertJsonPath('errors.outlet_id.0', "{$closed->name} sedang tutup dan belum menerima pesanan.");

    $this->travelTo(now()->setTime(23, 30));
    $this->postJson('/api/v1/orders', orderPayload($this->outlet, items($this->drink)), idem())
        ->assertUnprocessable()->assertJsonPath('errors.outlet_id.0', "{$this->outlet->name} buka Senin–Sabtu, pukul 07:00–22:00 WIB.");

    // Pesanan terjadwal untuk besok pagi diterima
    $this->postJson('/api/v1/orders', orderPayload($this->outlet, items($this->drink), ['scheduled_at' => now()->addDay()->setTime(9, 0)->toIso8601String()]), idem())
        ->assertCreated();

    $this->postJson('/api/v1/orders', orderPayload($this->outlet, items($this->drink), ['scheduled_at' => now()->subHour()->toIso8601String()]), idem())
        ->assertUnprocessable()->assertJsonValidationErrors('scheduled_at');
});

it('mensimulasikan harga keranjang tanpa menyimpan pesanan', function () {
    $this->postJson('/api/v1/orders/quote', orderPayload($this->outlet, items($this->drink)))
        ->assertOk()->assertJsonPath('data.total', 66000);

    expect(Order::count())->toBe(0);
});

it('menyimpan pesanan WhatsApp dan mengembalikan tautan wa.me', function () {
    $response = $this->postJson('/api/v1/orders/whatsapp', orderPayload($this->outlet, items($this->drink)), idem())->assertCreated();

    $response->assertJsonPath('data.channel', 'whatsapp')->assertJsonPath('data.status', 'pending');
    expect($response->json('whatsapp_url'))->toStartWith("https://wa.me/{$this->outlet->phone_wa}?text=")
        ->and(urldecode($response->json('whatsapp_url')))->toContain($response->json('data.code'))->toContain('Total: Rp66.000');
});

it('melacak pesanan dengan 4 digit terakhir nomor WA', function () {
    $code = $this->postJson('/api/v1/orders', orderPayload($this->outlet, items($this->drink)), idem())->json('data.code');

    $this->getJson("/api/v1/orders/{$code}?phone=7890")->assertOk()->assertJsonPath('data.code', $code);
    $this->getJson("/api/v1/orders/{$code}?phone=1111")->assertNotFound()->assertJsonPath('message', 'Data tidak ditemukan.');
    $this->getJson("/api/v1/orders/{$code}")->assertUnprocessable();
    $this->getJson('/api/v1/orders/TIDAKADA?phone=7890')->assertNotFound();
});

it('mengembalikan status pesanan untuk polling pembayaran', function () {
    $order = Order::factory()->status(OrderStatus::Pending)->create();

    $this->getJson("/api/v1/orders/{$order->code}/payment-status")
        ->assertOk()
        ->assertJsonPath('data.order_status', 'pending')
        ->assertJsonPath('data.payment', null)
        ->assertJsonPath('data.payment_deadline', $order->created_at->addMinutes(60)->toIso8601String());
});
