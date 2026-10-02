<?php

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Events\OrderStatusUpdated;
use App\Exceptions\BusinessException;
use App\Models\Order;
use App\Models\OrderStatusLog;
use App\Models\Payment;
use App\Services\Payments\ChargeRequest;
use App\Services\Payments\ManualQrisGateway;
use App\Services\Payments\PaymentGatewayManager;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Http;

/*
| QRIS statis (GoPay Merchant) + konfirmasi manual admin — PAYMENT_GATEWAY=manual (default).
*/

beforeEach(function () {
    $this->outlet = outlet();
    $this->order = Order::factory()->create(['outlet_id' => $this->outlet->id, 'total' => 33000, 'subtotal' => 33000]);
});

it('memakai gateway manual secara default', function () {
    expect(config('kamee.payment_gateway'))->toBe('manual')
        ->and(app(PaymentGatewayManager::class)->default())->toBeInstanceOf(ManualQrisGateway::class)
        ->and(config('kamee.payment_methods'))->toBe(['qris', 'cash']);
});

it('membuat tagihan QRIS statis yang menunggu konfirmasi admin', function () {
    $this->postJson("/api/v1/orders/{$this->order->code}/pay", ['method' => 'qris'], idem())
        ->assertCreated()
        ->assertJsonPath('data.method', 'qris')
        ->assertJsonPath('data.provider', 'manual')
        ->assertJsonPath('data.reference', "{$this->order->code}-1")
        ->assertJsonPath('data.amount', 33000)
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.qr_string', null)
        ->assertJsonPath('data.va_number', null)
        ->assertJsonPath('data.deeplink', null)
        ->assertJsonPath('data.qris_image_url', 'https://kamee.test/payments/qris-kameecoffee.jpg')
        ->assertJsonPath('data.merchant_name', 'KAMEECOFFEE')
        ->assertJsonPath('data.nmid', 'ID1026594722880')
        ->assertJsonPath('data.requires_manual_confirmation', true)
        ->assertJsonPath('data.expires_at', '2026-09-28T11:00:00+07:00')
        ->assertJsonPath('order_status', 'pending');

    // Polling status menampilkan QRIS yang sama; tidak ada panggilan ke penyedia luar.
    $this->getJson("/api/v1/orders/{$this->order->code}/payment-status")
        ->assertOk()
        ->assertJsonPath('data.payment.requires_manual_confirmation', true)
        ->assertJsonPath('data.payment.qris_image_url', 'https://kamee.test/payments/qris-kameecoffee.jpg');

    Http::assertNothingSent();
});

it('field QRIS manual bernilai null untuk penyedia lain', function () {
    $payment = Payment::factory()->create(['order_id' => $this->order->id, 'raw_payload' => ['qris_image_url' => 'x']]);

    $this->getJson("/api/v1/orders/{$this->order->code}/payment-status")
        ->assertJsonPath('data.payment.id', $payment->id)
        ->assertJsonPath('data.payment.qris_image_url', null)
        ->assertJsonPath('data.payment.merchant_name', null)
        ->assertJsonPath('data.payment.nmid', null)
        ->assertJsonPath('data.payment.requires_manual_confirmation', false);
});

it('gateway manual hanya melayani QRIS', function () {
    $gateway = app(ManualQrisGateway::class);

    $result = $gateway->charge(new ChargeRequest($this->order, PaymentMethod::Qris, 'REF-1', 33000, now()->addHour()));
    expect($result->reference)->toBe('REF-1')
        ->and($result->qrString)->toBeNull()
        ->and($result->raw)->toMatchArray(['manual' => true, 'merchant_name' => 'KAMEECOFFEE', 'nmid' => 'ID1026594722880']);

    expect(fn () => $gateway->charge(new ChargeRequest($this->order, PaymentMethod::EWallet, 'REF-2', 33000, now()->addHour())))
        ->toThrow(BusinessException::class, 'Metode pembayaran ini belum tersedia.');

    $this->postJson('/api/v1/webhooks/payments/manual', ['reference' => 'REF-1'])->assertNotFound();
});

it('menolak metode pembayaran yang tidak diaktifkan', function () {
    $this->postJson("/api/v1/orders/{$this->order->code}/pay", ['method' => 'ewallet', 'channel' => 'gopay'], idem())
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['payment_method' => 'Metode pembayaran tidak tersedia.']);

    $this->postJson("/api/v1/orders/{$this->order->code}/pay", ['payment_method' => 'bank_transfer'], idem())
        ->assertUnprocessable()
        ->assertJsonValidationErrors('payment_method');

    $product = snack(20000);
    $this->postJson('/api/v1/orders', orderPayload($this->outlet, [['product_id' => $product->id, 'qty' => 1]], ['payment_method' => 'ewallet']), idem())
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['payment_method' => 'Metode pembayaran tidak tersedia.']);

    $this->postJson('/api/v1/orders', orderPayload($this->outlet, [['product_id' => $product->id, 'qty' => 1]], ['payment_method' => 'qris']), idem())
        ->assertCreated();

    expect(Payment::count())->toBe(0);
});

it('mengaktifkan metode lewat konfigurasi', function () {
    config(['kamee.payment_methods' => ['qris', 'ewallet', 'cash']]);

    // Diterima validasi, tetapi gateway manual belum melayani e-wallet.
    $this->postJson("/api/v1/orders/{$this->order->code}/pay", ['method' => 'ewallet'], idem())
        ->assertUnprocessable()
        ->assertJsonPath('message', 'Metode pembayaran ini belum tersedia.');
});

it('admin outlet mengonfirmasi pembayaran QRIS manual', function () {
    Event::fake([OrderStatusUpdated::class]);
    $admin = actingAsAdmin(outletAdmin($this->outlet));

    $paymentId = $this->postJson("/api/v1/orders/{$this->order->code}/pay", ['method' => 'qris'], idem())->json('data.id');

    $this->travel(5)->minutes();
    $this->postJson("/api/v1/admin/orders/{$this->order->id}/confirm-payment", ['note' => 'Mutasi GoPay ref 8841'])
        ->assertOk()
        ->assertJsonPath('data.status', 'paid')
        ->assertJsonPath('data.payments.0.id', $paymentId)
        ->assertJsonPath('data.payments.0.status', 'paid')
        ->assertJsonPath('data.payments.0.requires_manual_confirmation', false)
        ->assertJsonPath('data.handled_by.id', $admin->id)
        ->assertJsonPath('message', 'Pembayaran dikonfirmasi. Pesanan berstatus "Sudah dibayar".')
        ->assertJsonFragment(['to_status' => 'paid', 'note' => "Pembayaran QRIS dikonfirmasi oleh {$admin->name}", 'changed_by' => $admin->name]);

    $payment = Payment::find($paymentId);
    expect($payment->status)->toBe(PaymentStatus::Paid)
        ->and($payment->paid_at->toIso8601String())->toBe(now()->toIso8601String())
        ->and($payment->raw_payload['confirmed_by'])->toBe(['id' => $admin->id, 'name' => $admin->name])
        ->and($payment->raw_payload['note'])->toBe('Mutasi GoPay ref 8841')
        ->and($payment->raw_payload['confirmed_at'])->toBe(now()->toIso8601String())
        ->and($payment->raw_payload['qris_image_url'])->toBe('https://kamee.test/payments/qris-kameecoffee.jpg')
        ->and($this->order->fresh()->status)->toBe(OrderStatus::Paid)
        ->and($this->order->fresh()->paid_at)->not->toBeNull()
        ->and(OrderStatusLog::where('order_id', $this->order->id)->where('to_status', 'paid')->value('changed_by'))->toBe($admin->id);

    Event::assertDispatched(OrderStatusUpdated::class, fn ($e) => $e->order->id === $this->order->id);
    expect(whatsapp()->sent)->not->toBeEmpty();
});

it('membuat tagihan QRIS manual bila pesanan belum punya tagihan', function () {
    actingAsAdmin(superAdmin());

    $this->postJson("/api/v1/admin/orders/{$this->order->id}/confirm-payment")
        ->assertOk()
        ->assertJsonPath('data.status', 'paid')
        ->assertJsonCount(1, 'data.payments')
        ->assertJsonPath('data.payments.0.provider', 'manual')
        ->assertJsonPath('data.payments.0.method', 'qris')
        ->assertJsonPath('data.payments.0.amount', 33000)
        ->assertJsonPath('data.payments.0.status', 'paid');
});

it('memakai tagihan QRIS manual yang sudah kedaluwarsa', function () {
    actingAsAdmin(superAdmin());
    $expired = Payment::factory()->create([
        'order_id' => $this->order->id, 'provider' => 'manual', 'amount' => 33000, 'qr_string' => null,
        'status' => PaymentStatus::Expired, 'raw_payload' => ['manual' => true],
    ]);

    $this->postJson("/api/v1/admin/orders/{$this->order->id}/confirm-payment")->assertOk();

    expect($expired->fresh()->status)->toBe(PaymentStatus::Paid)->and(Payment::count())->toBe(1);
});

it('menolak konfirmasi untuk pesanan yang tidak menunggu pembayaran', function () {
    actingAsAdmin(superAdmin());
    $paid = Order::factory()->status(OrderStatus::Processing)->create(['outlet_id' => $this->outlet->id]);

    $this->postJson("/api/v1/admin/orders/{$paid->id}/confirm-payment")
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['order' => 'Pesanan tidak dalam status menunggu pembayaran.']);

    expect(Payment::count())->toBe(0);
});

it('admin outlet lain tidak dapat mengonfirmasi pembayaran', function () {
    $other = outlet(['name' => 'Outlet Lain']);
    actingAsAdmin(outletAdmin($other));

    // Pesanan outlet lain tidak terlihat (scope outlet) → 404, sama seperti ubah status.
    $this->postJson("/api/v1/admin/orders/{$this->order->id}/confirm-payment")->assertNotFound();

    expect($this->order->fresh()->status)->toBe(OrderStatus::Pending)->and(Payment::count())->toBe(0);
});

it('mewajibkan login admin untuk konfirmasi pembayaran', function () {
    $this->postJson("/api/v1/admin/orders/{$this->order->id}/confirm-payment")->assertUnauthorized();

    actingAsCustomer();
    $this->postJson("/api/v1/admin/orders/{$this->order->id}/confirm-payment")->assertForbidden();

    expect($this->order->fresh()->status)->toBe(OrderStatus::Pending);
});

it('rekonsiliasi melewati QRIS manual dan pesanan dibatalkan setelah 60 menit', function () {
    $payment = Payment::factory()->create([
        'order_id' => $this->order->id, 'provider' => 'manual', 'qr_string' => null, 'created_at' => now()->subMinutes(3),
    ]);

    $this->artisan('payments:reconcile')->expectsOutput('0 pembayaran diperbarui.');

    $this->travel(59)->minutes();
    $this->artisan('orders:cancel-unpaid')->expectsOutput('0 pesanan dibatalkan otomatis.');

    $this->travel(2)->minutes();
    $this->artisan('orders:cancel-unpaid')->expectsOutput('1 pesanan dibatalkan otomatis.');

    expect($this->order->fresh()->status)->toBe(OrderStatus::Cancelled)
        ->and($this->order->fresh()->cancelled_reason)->toBe('Dibatalkan otomatis: pembayaran melewati batas 60 menit.')
        ->and($payment->fresh()->status)->toBe(PaymentStatus::Expired);
    Http::assertNothingSent();
});
