<?php

use App\Enums\OrderStatus;
use App\Enums\PaymentStatus;
use App\Models\LoyaltyTransaction;
use App\Models\Order;
use App\Models\Payment;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Facades\Http;

function midtransStatus(string $ref, string $status, int $amount): array
{
    return ['status_code' => '200', 'order_id' => $ref, 'transaction_status' => $status, 'gross_amount' => "{$amount}.00"];
}

it('mendaftarkan tiga tugas terjadwal', function () {
    $events = collect(app(Schedule::class)->events())->mapWithKeys(fn ($e) => [str($e->command)->after("artisan' ")->toString() => $e->expression]);

    expect($events->all())->toMatchArray([
        'orders:cancel-unpaid' => '* * * * *',
        'payments:reconcile' => '*/5 * * * *',
        'loyalty:expire-points' => '15 0 * * *',
    ]);
});

it('membatalkan pesanan belum dibayar lebih dari 15 menit', function () {
    Http::fake(['*' => Http::response(midtransStatus('x', 'pending', 1))]);

    $stale = Order::factory()->create(['created_at' => now()->subMinutes(16)]);
    $pendingPayment = Payment::factory()->create(['order_id' => $stale->id]);
    $fresh = Order::factory()->create(['created_at' => now()->subMinutes(10)]);
    $cash = Order::factory()->create(['created_at' => now()->subMinutes(30)]);
    Payment::factory()->cash()->create(['order_id' => $cash->id]);

    $this->artisan('orders:cancel-unpaid')->expectsOutput('1 pesanan dibatalkan otomatis.')->assertSuccessful();

    expect($stale->fresh()->status)->toBe(OrderStatus::Cancelled)
        ->and($stale->fresh()->cancelled_reason)->toBe('Dibatalkan otomatis: pembayaran melewati batas 15 menit.')
        ->and($pendingPayment->fresh()->status)->toBe(PaymentStatus::Expired)
        ->and($fresh->fresh()->status)->toBe(OrderStatus::Pending)
        ->and($cash->fresh()->status)->toBe(OrderStatus::Pending);
});

it('tidak membatalkan pesanan yang ternyata sudah dibayar (webhook terlambat)', function () {
    $order = Order::factory()->create(['created_at' => now()->subMinutes(20), 'total' => 45000]);
    $payment = Payment::factory()->create(['order_id' => $order->id, 'amount' => 45000]);
    Http::fake(['*' => Http::response(midtransStatus($payment->provider_ref, 'settlement', 45000))]);

    $this->artisan('orders:cancel-unpaid')->expectsOutput('0 pesanan dibatalkan otomatis.');

    expect($order->fresh()->status)->toBe(OrderStatus::Paid);
});

it('merekonsiliasi pembayaran pending dengan status gateway', function () {
    $paid = Payment::factory()->create(['order_id' => Order::factory()->create(['total' => 50000])->id, 'amount' => 50000, 'created_at' => now()->subMinutes(3)]);
    $still = Payment::factory()->create(['order_id' => Order::factory()->create()->id, 'created_at' => now()->subMinutes(3)]);
    $tooNew = Payment::factory()->create(['order_id' => Order::factory()->create()->id]);

    Http::fake([
        "*/v2/{$paid->provider_ref}/status" => Http::response(midtransStatus($paid->provider_ref, 'settlement', 50000)),
        "*/v2/{$still->provider_ref}/status" => Http::response(midtransStatus($still->provider_ref, 'pending', 50000)),
    ]);

    $this->artisan('payments:reconcile')->expectsOutput('1 pembayaran diperbarui.');

    expect($paid->fresh()->status)->toBe(PaymentStatus::Paid)
        ->and($paid->order->fresh()->status)->toBe(OrderStatus::Paid)
        ->and($still->fresh()->status)->toBe(PaymentStatus::Pending)
        ->and($tooNew->fresh()->status)->toBe(PaymentStatus::Pending);
});

it('rekonsiliasi tahan terhadap gateway yang gagal', function () {
    Payment::factory()->create(['order_id' => Order::factory()->create()->id, 'created_at' => now()->subMinutes(3)]);
    Http::fake(['*' => Http::response('down', 503)]);

    $this->artisan('payments:reconcile')->expectsOutput('0 pembayaran diperbarui.')->assertSuccessful();
});

it('mengedaluwarsakan poin lewat perintah terjadwal', function () {
    $customer = customer();
    LoyaltyTransaction::factory()->for($customer)->create(['points' => 30, 'expires_at' => now()->subDay()]);
    $customer->forceFill(['points_balance' => 30])->save();

    $this->artisan('loyalty:expire-points')->expectsOutput('30 poin kedaluwarsa.');

    expect($customer->fresh()->points_balance)->toBe(0);
});
