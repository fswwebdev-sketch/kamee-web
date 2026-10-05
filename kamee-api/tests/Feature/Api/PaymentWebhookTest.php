<?php

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Models\Payment;
use App\Services\Payments\FakeGateway;

function midtransNotification(Payment $payment, string $status = 'settlement', array $overrides = []): array
{
    $payload = array_replace([
        'order_id' => $payment->provider_ref,
        'status_code' => $status === 'settlement' ? '200' : '201',
        'gross_amount' => number_format($payment->amount, 2, '.', ''),
        'transaction_status' => $status,
        'payment_type' => 'qris',
        'fraud_status' => 'accept',
    ], $overrides);

    $payload['signature_key'] ??= hash('sha512', $payload['order_id'].$payload['status_code'].$payload['gross_amount'].'SB-Mid-server-TEST');

    return $payload;
}

beforeEach(function () {
    $this->order = Order::factory()->create(['total' => 50000]);
    $this->payment = Payment::factory()->create(['order_id' => $this->order->id, 'amount' => 50000, 'provider_ref' => "{$this->order->code}-1"]);
});

it('menandai pembayaran & pesanan lunas saat settlement dengan signature valid', function () {
    $this->postJson('/api/v1/webhooks/payments/midtrans', midtransNotification($this->payment))
        ->assertOk()->assertJsonPath('message', 'Notifikasi diproses.');

    expect($this->payment->fresh()->status)->toBe(PaymentStatus::Paid)
        ->and($this->payment->fresh()->paid_at)->not->toBeNull()
        ->and($this->order->fresh()->status)->toBe(OrderStatus::Paid)
        ->and($this->order->statusLogs()->latest('id')->first()->note)->toBe('Pembayaran QRIS diterima');
});

it('idempoten: notifikasi yang sama tidak diproses dua kali', function () {
    $payload = midtransNotification($this->payment);

    $this->postJson('/api/v1/webhooks/payments/midtrans', $payload)->assertOk();
    $this->postJson('/api/v1/webhooks/payments/midtrans', $payload)->assertOk()->assertJsonPath('message', 'Notifikasi sudah pernah diproses.');

    expect($this->order->statusLogs()->where('to_status', 'paid')->count())->toBe(1);
});

it('menolak signature yang tidak valid atau payload tidak lengkap', function () {
    $this->postJson('/api/v1/webhooks/payments/midtrans', midtransNotification($this->payment, overrides: ['signature_key' => 'palsu']))
        ->assertForbidden()->assertJsonPath('message', 'Signature webhook tidak valid.');

    $this->postJson('/api/v1/webhooks/payments/midtrans', ['order_id' => 'x'])->assertForbidden();

    // Nominal diubah → signature tidak cocok
    $tampered = midtransNotification($this->payment);
    $tampered['gross_amount'] = '1.00';
    $this->postJson('/api/v1/webhooks/payments/midtrans', $tampered)->assertForbidden();

    expect($this->payment->fresh()->status)->toBe(PaymentStatus::Pending);
});

it('menolak nominal yang tidak sesuai tagihan', function () {
    $this->postJson('/api/v1/webhooks/payments/midtrans', midtransNotification($this->payment, overrides: ['gross_amount' => '10000.00']))
        ->assertUnprocessable()->assertJsonPath('message', 'Nominal pembayaran tidak sesuai.');

    expect($this->order->fresh()->status)->toBe(OrderStatus::Pending);
});

it('memetakan status expire / deny / pending dan tidak memundurkan status final', function () {
    $this->postJson('/api/v1/webhooks/payments/midtrans', midtransNotification($this->payment, 'pending'))
        ->assertOk()->assertJsonPath('message', 'Notifikasi sudah pernah diproses.');

    $this->postJson('/api/v1/webhooks/payments/midtrans', midtransNotification($this->payment, 'expire'))->assertOk();
    expect($this->payment->fresh()->status)->toBe(PaymentStatus::Expired)
        ->and($this->order->fresh()->status)->toBe(OrderStatus::Pending);

    $this->postJson('/api/v1/webhooks/payments/midtrans', midtransNotification($this->payment, 'settlement'))
        ->assertOk()->assertJsonPath('message', 'Status pembayaran sudah final, notifikasi diabaikan.');

    $other = Payment::factory()->create(['order_id' => Order::factory()->create()->id, 'amount' => 50000]);
    $this->postJson('/api/v1/webhooks/payments/midtrans', midtransNotification($other, 'deny'))->assertOk();
    expect($other->fresh()->status)->toBe(PaymentStatus::Failed);
});

it('mencatat refund setelah lunas', function () {
    $this->postJson('/api/v1/webhooks/payments/midtrans', midtransNotification($this->payment))->assertOk();
    $this->postJson('/api/v1/webhooks/payments/midtrans', midtransNotification($this->payment, 'refund'))->assertOk();

    expect($this->payment->fresh()->status)->toBe(PaymentStatus::Refunded);
});

it('tetap mencatat pembayaran terlambat untuk pesanan yang sudah dibatalkan', function () {
    $this->order->forceFill(['status' => OrderStatus::Cancelled])->save();

    $this->postJson('/api/v1/webhooks/payments/midtrans', midtransNotification($this->payment))->assertOk();

    expect($this->payment->fresh()->status)->toBe(PaymentStatus::Paid)
        ->and($this->order->fresh()->status)->toBe(OrderStatus::Cancelled);
});

it('mengembalikan 404 untuk referensi atau penyedia yang tidak dikenal', function () {
    $this->payment->provider_ref = 'TIDAK-ADA';
    $this->postJson('/api/v1/webhooks/payments/midtrans', midtransNotification($this->payment))
        ->assertNotFound()->assertJsonPath('message', 'Transaksi pembayaran tidak ditemukan.');

    $this->postJson('/api/v1/webhooks/payments/xendit', [])->assertNotFound()->assertJsonPath('message', 'Penyedia pembayaran tidak dikenal.');
});

it('mendukung simulator pembayaran lokal dengan signature HMAC', function () {
    $payment = Payment::factory()->create(['order_id' => Order::factory()->create(['total' => 30000])->id, 'provider' => 'fake', 'amount' => 30000]);
    $body = json_encode(['reference' => $payment->provider_ref, 'status' => 'paid', 'amount' => 30000]);
    $gateway = app(FakeGateway::class);

    $this->call('POST', '/api/v1/webhooks/payments/fake', [], [], [], ['CONTENT_TYPE' => 'application/json', 'HTTP_X_SIGNATURE' => 'salah'], $body)->assertForbidden();
    $this->call('POST', '/api/v1/webhooks/payments/fake', [], [], [], ['CONTENT_TYPE' => 'application/json', 'HTTP_X_SIGNATURE' => $gateway->sign($body)], $body)->assertOk();

    expect($payment->fresh()->status)->toBe(PaymentStatus::Paid);
});
