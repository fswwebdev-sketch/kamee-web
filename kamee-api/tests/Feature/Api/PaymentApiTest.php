<?php

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Models\Payment;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

const MIDTRANS = 'https://api.sandbox.midtrans.com';

function midtransCharge(array $overrides = []): array
{
    return array_replace([
        'status_code' => '201',
        'status_message' => 'Transaction is created',
        'transaction_id' => 'trx-123',
        'transaction_status' => 'pending',
        'gross_amount' => '50000.00',
        'expiry_time' => '2026-09-28 11:00:00',
    ], $overrides);
}

beforeEach(function () {
    // Tes ini khusus Midtrans Core API (semua metode online aktif).
    config(['kamee.payment_gateway' => 'midtrans', 'kamee.payment_methods' => ['qris', 'ewallet', 'bank_transfer', 'cash']]);

    $this->order = Order::factory()->create(['total' => 50000, 'subtotal' => 50000, 'customer_phone' => '6281234567890']);
});

it('membuat transaksi QRIS di Midtrans', function () {
    Http::fake([MIDTRANS.'/v2/charge' => Http::response(midtransCharge([
        'qr_string' => '00020101021226620014COM.GO-JEK.WWW',
        'actions' => [['name' => 'generate-qr-code', 'url' => MIDTRANS.'/v2/qris/trx-123/qr-code']],
    ]))]);

    $this->postJson("/api/v1/orders/{$this->order->code}/pay", ['method' => 'qris'], idem())
        ->assertCreated()
        ->assertJsonPath('data.method', 'qris')
        ->assertJsonPath('data.provider', 'midtrans')
        ->assertJsonPath('data.reference', "{$this->order->code}-1")
        ->assertJsonPath('data.qr_string', '00020101021226620014COM.GO-JEK.WWW')
        ->assertJsonPath('data.amount', 50000)
        ->assertJsonPath('data.expires_at', '2026-09-28T11:00:00+07:00')
        ->assertJsonPath('order_status', 'pending');

    Http::assertSent(fn (Request $r) => $r->url() === MIDTRANS.'/v2/charge'
        && $r['payment_type'] === 'qris'
        && $r['transaction_details'] === ['order_id' => "{$this->order->code}-1", 'gross_amount' => 50000]
        && $r['custom_expiry']['expiry_duration'] === 60
        && $r->hasHeader('Authorization', 'Basic '.base64_encode('SB-Mid-server-TEST:')));
});

it('membuat transaksi e-wallet (deeplink) dan Virtual Account', function () {
    Http::fakeSequence(MIDTRANS.'/v2/charge')
        ->push(midtransCharge(['actions' => [['name' => 'deeplink-redirect', 'url' => 'https://gopay.co.id/app/deeplink?x=1']]]))
        ->push(midtransCharge(['va_numbers' => [['bank' => 'bni', 'va_number' => '9881234567']]]))
        ->push(midtransCharge(['permata_va_number' => '8778001122']));

    $this->postJson("/api/v1/orders/{$this->order->code}/pay", ['method' => 'ewallet', 'channel' => 'shopeepay'], idem())
        ->assertCreated()->assertJsonPath('data.deeplink', 'https://gopay.co.id/app/deeplink?x=1');

    $this->postJson("/api/v1/orders/{$this->order->code}/pay", ['method' => 'bank_transfer', 'channel' => 'bni'], idem())
        ->assertCreated()->assertJsonPath('data.va_number', '9881234567')->assertJsonPath('data.bank', 'bni')
        ->assertJsonPath('data.reference', "{$this->order->code}-2");

    $this->postJson("/api/v1/orders/{$this->order->code}/pay", ['method' => 'bank_transfer', 'channel' => 'permata'], idem())
        ->assertCreated()->assertJsonPath('data.va_number', '8778001122');

    Http::assertSent(fn (Request $r) => ($r['payment_type'] ?? null) === 'shopeepay');
    Http::assertSent(fn (Request $r) => ($r['bank_transfer']['bank'] ?? null) === 'bni');
    Http::assertSent(fn (Request $r) => ($r['payment_type'] ?? null) === 'permata');

    // Tagihan lama otomatis tidak berlaku lagi
    expect($this->order->payments()->where('status', PaymentStatus::Pending)->count())->toBe(1);
});

it('memakai ulang tagihan pending yang masih berlaku', function () {
    Http::fake([MIDTRANS.'/v2/charge' => Http::response(midtransCharge(['qr_string' => 'QR1']))]);

    $first = $this->postJson("/api/v1/orders/{$this->order->code}/pay", ['method' => 'qris'], idem())->json('data.id');
    $second = $this->postJson("/api/v1/orders/{$this->order->code}/pay", ['method' => 'qris'], idem())->json('data.id');

    expect($second)->toBe($first);
    Http::assertSentCount(1);
});

it('memvalidasi metode & kanal pembayaran', function () {
    $this->postJson("/api/v1/orders/{$this->order->code}/pay", ['method' => 'kartu'], idem())->assertJsonValidationErrors('method');
    $this->postJson("/api/v1/orders/{$this->order->code}/pay", ['method' => 'qris', 'channel' => 'bca'], idem())->assertJsonValidationErrors('channel');
    $this->postJson("/api/v1/orders/{$this->order->code}/pay", ['method' => 'bank_transfer', 'channel' => 'mandiri'], idem())->assertJsonValidationErrors('channel');
});

it('pembayaran tunai langsung memproses pesanan', function () {
    $this->postJson("/api/v1/orders/{$this->order->code}/pay", ['method' => 'cash'], idem())
        ->assertCreated()
        ->assertJsonPath('data.method', 'cash')
        ->assertJsonPath('order_status', 'processing');

    expect($this->order->fresh()->status)->toBe(OrderStatus::Processing);
    Http::assertNothingSent();
});

it('menolak pembayaran untuk pesanan yang bukan pending atau sudah lewat batas waktu', function () {
    $paid = Order::factory()->status(OrderStatus::Paid)->create();
    $this->postJson("/api/v1/orders/{$paid->code}/pay", ['method' => 'qris'], idem())
        ->assertUnprocessable()->assertJsonPath('message', 'Pesanan tidak dalam status menunggu pembayaran.');

    $this->travel(61)->minutes();
    $this->postJson("/api/v1/orders/{$this->order->code}/pay", ['method' => 'qris'], idem())
        ->assertUnprocessable()->assertJsonPath('message', 'Batas waktu pembayaran sudah habis. Silakan buat pesanan baru.');
});

it('mengembalikan 502 saat gateway gagal', function () {
    Http::fake([MIDTRANS.'/v2/charge' => Http::response(['status_code' => '500'], 500)]);

    $this->postJson("/api/v1/orders/{$this->order->code}/pay", ['method' => 'qris'], idem())
        ->assertStatus(502)
        ->assertJsonPath('message', fn ($m) => str_starts_with($m, 'Gagal menghubungi penyedia pembayaran.'));

    Http::fake([MIDTRANS.'/v2/charge' => Http::response(['status_code' => '406', 'status_message' => 'Duplicate order ID'])]);
    $this->postJson("/api/v1/orders/{$this->order->code}/pay", ['method' => 'qris'], idem())->assertStatus(502);

    Http::fake([MIDTRANS.'/v2/charge' => fn () => throw new ConnectionException('timeout')]);
    $this->postJson("/api/v1/orders/{$this->order->code}/pay", ['method' => 'qris'], idem())->assertStatus(502);

    expect(Payment::count())->toBe(0);
});

it('Idempotency-Key pada /pay mencegah tagihan ganda', function () {
    Http::fake([MIDTRANS.'/v2/charge' => Http::response(midtransCharge(['qr_string' => 'QR1']))]);

    $this->postJson("/api/v1/orders/{$this->order->code}/pay", ['method' => 'qris'], idem('pay-1'))->assertCreated();
    $this->postJson("/api/v1/orders/{$this->order->code}/pay", ['method' => 'qris'], idem('pay-1'))->assertHeader('Idempotent-Replayed', 'true');

    expect(Payment::count())->toBe(1);
});
