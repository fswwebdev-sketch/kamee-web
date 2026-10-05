<?php

use App\Enums\LoyaltyTransactionType;
use App\Enums\OrderStatus;
use App\Exceptions\BusinessException;
use App\Models\LoyaltyTier;
use App\Models\LoyaltyTransaction;
use App\Models\Order;
use App\Services\LoyaltyService;
use App\Services\OrderStateMachine;
use Illuminate\Support\Carbon;

beforeEach(fn () => $this->loyalty = app(LoyaltyService::class));

function completedOrder($customer, int $total, array $extra = []): Order
{
    return Order::factory()->status(OrderStatus::Completed)->create($extra + [
        'customer_id' => $customer->id, 'subtotal' => $total, 'total' => $total,
    ]);
}

it('menentukan tier dari total belanja', function () {
    expect($this->loyalty->tierFor(0)->name)->toBe('Bronze')
        ->and($this->loyalty->tierFor(1_000_000)->name)->toBe('Silver')
        ->and($this->loyalty->tierFor(7_500_000)->name)->toBe('Gold');
});

it('memberi poin saat pesanan selesai sesuai multiplier tier (tanpa ongkir)', function () {
    $customer = customer();
    $order = completedOrder($customer, 98000, ['delivery_fee' => 8000]);

    $tx = $this->loyalty->earnForOrder($order);

    // (98.000 − 8.000) / 10.000 = 9 poin × 1,0
    expect($tx->points)->toBe(9)->and($tx->type)->toBe(LoyaltyTransactionType::Earn)
        ->and($tx->expires_at->toDateString())->toBe(now()->addMonths(12)->toDateString())
        ->and($customer->fresh()->points_balance)->toBe(9)
        ->and($customer->fresh()->lifetime_spend)->toBe(98000);

    $gold = customer(['tier_id' => LoyaltyTier::where('name', 'Gold')->value('id')]);
    expect($this->loyalty->earnForOrder(completedOrder($gold, 100000))->points)->toBe(15);
});

it('tidak memberi poin dua kali untuk pesanan yang sama', function () {
    $customer = customer();
    $order = completedOrder($customer, 50000);

    $this->loyalty->earnForOrder($order);
    expect($this->loyalty->earnForOrder($order))->toBeNull()
        ->and($customer->fresh()->points_balance)->toBe(5)
        ->and($customer->fresh()->lifetime_spend)->toBe(50000);
});

it('tidak memberi poin untuk tamu', function () {
    expect($this->loyalty->earnForOrder(Order::factory()->create()))->toBeNull();
});

it('menaikkan tier saat total belanja melewati ambang', function () {
    $customer = customer();
    $customer->forceFill(['lifetime_spend' => 950_000])->save();

    $this->loyalty->earnForOrder(completedOrder($customer, 60000));

    expect($customer->fresh()->tier->name)->toBe('Silver');
});

it('memvalidasi penukaran poin', function () {
    $customer = customer();
    $customer->forceFill(['points_balance' => 100])->save();

    expect(fn () => $this->loyalty->validateRedeem($customer, 5, 100000))->toThrow(BusinessException::class, 'Minimal penukaran 10 poin')
        ->and(fn () => $this->loyalty->validateRedeem($customer, 150, 100000))->toThrow(BusinessException::class, 'Poin tidak mencukupi')
        ->and(fn () => $this->loyalty->validateRedeem($customer, 100, 10000))->toThrow(BusinessException::class, 'Maksimal 50 poin')
        ->and($this->loyalty->validateRedeem($customer, 50, 10000))->toBe(5000);
});

it('menukar dan mengembalikan poin saat pesanan dibatalkan', function () {
    $customer = customer();
    $customer->forceFill(['points_balance' => 100])->save();
    $order = Order::factory()->create(['customer_id' => $customer->id]);

    $this->loyalty->redeemForOrder($customer, 40, $order);
    expect($customer->fresh()->points_balance)->toBe(60);

    app(OrderStateMachine::class)->transition($order, OrderStatus::Cancelled, null, 'Batal');

    expect($customer->fresh()->points_balance)->toBe(100)
        ->and($this->loyalty->refundRedeemForOrder($order))->toBeNull(); // idempoten
});

it('menolak penukaran bila saldo berubah sebelum disimpan', function () {
    $customer = customer();
    $customer->forceFill(['points_balance' => 10])->save();

    $this->loyalty->redeemForOrder($customer, 20, Order::factory()->create());
})->throws(BusinessException::class, 'Poin tidak mencukupi.');

it('mencatat koreksi poin oleh admin', function () {
    $customer = customer();
    $admin = superAdmin();

    $tx = $this->loyalty->adjust($customer, 25, 'Kompensasi', $admin);
    expect($tx->type)->toBe(LoyaltyTransactionType::Adjust)->and($tx->note)->toContain($admin->name)
        ->and($customer->fresh()->points_balance)->toBe(25);

    expect(fn () => $this->loyalty->adjust($customer, -30, 'Koreksi'))->toThrow(BusinessException::class, 'melebihi saldo')
        ->and(fn () => $this->loyalty->adjust($customer, 0, 'Nol'))->toThrow(BusinessException::class);
});

it('mengedaluwarsakan poin secara FIFO dan idempoten', function () {
    $customer = customer();
    // 100 poin didapat 13 bulan lalu (kedaluwarsa), 50 poin bulan lalu (masih berlaku)
    $this->travelTo(now()->subMonths(13));
    $this->loyalty->earnForOrder(completedOrder($customer, 1_000_000));
    $this->travelBack();
    $this->travelTo(Carbon::parse('2026-09-28 10:00', 'Asia/Jakarta')->subMonth());
    $this->loyalty->earnForOrder(completedOrder($customer->fresh(), 500_000));
    $this->travelTo(Carbon::parse('2026-09-28 10:00', 'Asia/Jakarta'));

    // Silver (≥1jt) setelah pesanan pertama → 500rb × 1,25 = 62 poin; total 162
    $customer->refresh();
    expect($customer->points_balance)->toBe(162);

    // Tukar 30 poin → memakai poin tertua lebih dulu
    $this->loyalty->redeemForOrder($customer, 30, Order::factory()->create(['customer_id' => $customer->id]));

    expect($this->loyalty->expireFor($customer))->toBe(70)
        ->and($customer->fresh()->points_balance)->toBe(62)
        ->and($this->loyalty->expireFor($customer->fresh()))->toBe(0);

    expect((int) LoyaltyTransaction::where('type', LoyaltyTransactionType::Expire)->sum('points'))->toBe(-70);
});

it('expireAll memproses semua pelanggan dan expiringSoon memberi info', function () {
    $a = customer();
    $b = customer();
    LoyaltyTransaction::factory()->for($a)->create(['points' => 40, 'expires_at' => now()->subDay()]);
    $a->forceFill(['points_balance' => 40])->save();
    LoyaltyTransaction::factory()->for($b)->create(['points' => 25, 'expires_at' => now()->addDays(10)]);
    $b->forceFill(['points_balance' => 25])->save();

    expect($this->loyalty->expiringSoon($b))->toBe(25)
        ->and($this->loyalty->expireAll())->toBe(40)
        ->and($a->fresh()->points_balance)->toBe(0)
        ->and($b->fresh()->points_balance)->toBe(25);
});

it('membuat simulasi penukaran poin', function () {
    $customer = customer();
    $customer->forceFill(['points_balance' => 300])->save();

    $preview = $this->loyalty->preview($customer, 400, 56000);

    // maks 50% × 56.000 = 28.000 → 280 poin
    expect($preview)->toMatchArray(['applicable_points' => 280, 'max_points' => 280, 'discount' => 28000, 'balance_after' => 20])
        ->and($preview['message'])->toContain('Hanya 280 poin')
        ->and($this->loyalty->preview($customer, 100, 56000)['message'])->toContain('Tukar 100 poin');
});

it('menunjukkan tier berikutnya', function () {
    expect($this->loyalty->nextTier(customer())->name)->toBe('Silver');
});
