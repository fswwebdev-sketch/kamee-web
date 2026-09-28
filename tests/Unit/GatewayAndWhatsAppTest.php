<?php

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Models\Payment;
use App\Services\Payments\ChargeRequest;
use App\Services\Payments\FakeGateway;
use App\Services\Payments\MidtransGateway;
use App\Services\WhatsApp\FonnteWhatsApp;
use App\Services\WhatsApp\LogWhatsApp;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

it('memetakan status transaksi Midtrans', function (string $status, ?string $fraud, PaymentStatus $expected) {
    expect(MidtransGateway::mapStatus($status, $fraud))->toBe($expected);
})->with([
    ['settlement', null, PaymentStatus::Paid],
    ['capture', 'accept', PaymentStatus::Paid],
    ['capture', 'challenge', PaymentStatus::Pending],
    ['pending', null, PaymentStatus::Pending],
    ['expire', null, PaymentStatus::Expired],
    ['cancel', null, PaymentStatus::Failed],
    ['deny', null, PaymentStatus::Failed],
    ['refund', null, PaymentStatus::Refunded],
    ['partial_refund', null, PaymentStatus::Refunded],
]);

it('mengirim refund ke Midtrans', function () {
    Http::fake(['*/refund' => Http::response(['status_code' => '200'])]);
    $payment = Payment::factory()->create(['order_id' => Order::factory()->create()->id, 'provider_ref' => 'KM1-1']);

    expect(app(MidtransGateway::class)->refund($payment, 50000, 'Stok habis'))->toBeTrue();

    Http::assertSent(fn (Request $r) => str_ends_with($r->url(), '/v2/KM1-1/refund') && $r['amount'] === 50000 && $r['refund_key'] === 'KM1-1-refund');
});

it('simulator lokal membuat QR, VA, dan deeplink', function () {
    $gateway = app(FakeGateway::class);
    $order = Order::factory()->create(['total' => 10000]);

    foreach ([PaymentMethod::Qris, PaymentMethod::BankTransfer, PaymentMethod::EWallet] as $method) {
        $result = $gateway->charge(new ChargeRequest($order, $method, 'REF', 10000, now()->addMinutes(15)));
        expect($result->qrString ?? $result->vaNumber ?? $result->deeplink)->not->toBeNull();
    }

    FakeGateway::$statuses['REF'] = PaymentStatus::Paid;
    expect($gateway->status('REF')->status)->toBe(PaymentStatus::Paid)
        ->and($gateway->refund(Payment::factory()->make(), 1, 'x'))->toBeTrue();
});

it('mengirim WhatsApp lewat Fonnte', function () {
    Http::fake(['api.fonnte.com/*' => Http::response(['status' => true])]);

    expect((new FonnteWhatsApp('token-123', 'https://api.fonnte.com/send'))->send('6281234567890', 'Halo'))->toBeTrue();

    Http::assertSent(fn (Request $r) => $r->hasHeader('Authorization', 'token-123') && $r['target'] === '6281234567890' && $r['message'] === 'Halo');
});

it('Fonnte mengembalikan false saat gagal tanpa melempar exception', function () {
    Http::fake(['*' => Http::response(['status' => false, 'reason' => 'invalid token'])]);
    expect((new FonnteWhatsApp('x', 'https://api.fonnte.com/send'))->send('62812', 'Halo'))->toBeFalse();

    Http::fake(['*' => fn () => throw new ConnectionException('timeout')]);
    expect((new FonnteWhatsApp('x', 'https://api.fonnte.com/send'))->send('62812', 'Halo'))->toBeFalse();
});

it('driver log menulis pesan ke log', function () {
    Log::shouldReceive('channel')->andReturnSelf();
    Log::shouldReceive('info')->once()->withArgs(fn ($msg, $ctx) => str_contains($msg, '62812') && $ctx['message'] === 'Halo');

    expect((new LogWhatsApp)->send('62812', 'Halo'))->toBeTrue();
});
