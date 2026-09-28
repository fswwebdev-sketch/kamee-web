<?php

use App\Enums\FulfillmentType;
use App\Enums\OrderStatus as S;
use App\Enums\PaymentStatus;
use App\Events\OrderStatusUpdated;
use App\Exceptions\InvalidOrderTransition;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Payment;
use App\Services\OrderStateMachine;
use Illuminate\Support\Facades\Event;

beforeEach(fn () => $this->machine = app(OrderStateMachine::class));

function orderIn(S $status, FulfillmentType $fulfillment = FulfillmentType::Pickup, bool $cash = false): Order
{
    $order = Order::factory()->status($status)->create(['fulfillment' => $fulfillment]);
    if ($cash) {
        Payment::factory()->cash()->create(['order_id' => $order->id, 'amount' => $order->total]);
    }

    return $order;
}

it('mengizinkan alur utama pesanan antar: pending → paid → processing → shipped → completed', function () {
    $order = orderIn(S::Pending, FulfillmentType::Delivery);

    foreach ([S::Paid, S::Processing, S::Shipped, S::Completed] as $to) {
        $this->machine->transition($order, $to);
        expect($order->status)->toBe($to);
    }

    expect($order->paid_at)->not->toBeNull()->and($order->completed_at)->not->toBeNull()
        ->and($order->statusLogs()->pluck('to_status')->all())->toBe(['paid', 'processing', 'shipped', 'completed']);
});

it('mengizinkan pesanan non-antar langsung selesai dari processing', function () {
    $order = orderIn(S::Processing, FulfillmentType::DineIn);

    $this->machine->transition($order, S::Completed);

    expect($order->status)->toBe(S::Completed);
});

it('tunai: pending → processing diperbolehkan hanya untuk pembayaran tunai', function () {
    $this->machine->transition($cash = orderIn(S::Pending, cash: true), S::Processing);
    expect($cash->status)->toBe(S::Processing);

    $this->machine->transition(orderIn(S::Pending), S::Processing);
})->throws(InvalidOrderTransition::class, 'harus dibayar terlebih dahulu');

it('menolak transisi yang tidak valid', function (S $from, S $to, FulfillmentType $fulfillment = FulfillmentType::Pickup) {
    $this->machine->transition(orderIn($from, $fulfillment), $to);
})->throws(InvalidOrderTransition::class)->with([
    'pending → shipped' => [S::Pending, S::Shipped],
    'pending → completed' => [S::Pending, S::Completed],
    'paid → completed' => [S::Paid, S::Completed],
    'paid → cancelled (harus refund)' => [S::Paid, S::Cancelled],
    'completed → cancelled' => [S::Completed, S::Cancelled],
    'cancelled → paid' => [S::Cancelled, S::Paid],
    'shipped → cancelled' => [S::Shipped, S::Cancelled, FulfillmentType::Delivery],
    'status sama' => [S::Processing, S::Processing],
    'pickup → shipped' => [S::Processing, S::Shipped, FulfillmentType::Pickup],
    'antar processing → completed' => [S::Processing, S::Completed, FulfillmentType::Delivery],
]);

it('membatalkan dari pending dan processing (tunai)', function () {
    $pending = orderIn(S::Pending);
    Payment::factory()->create(['order_id' => $pending->id]);
    $this->machine->transition($pending, S::Cancelled, null, 'Stok habis');

    expect($pending->status)->toBe(S::Cancelled)->and($pending->cancelled_reason)->toBe('Stok habis')
        ->and($pending->payments()->first()->status)->toBe(PaymentStatus::Expired);

    $processing = orderIn(S::Processing, cash: true);
    $this->machine->transition($processing, S::Cancelled, null, 'Pelanggan batal');
    expect($processing->status)->toBe(S::Cancelled);
});

it('menolak pembatalan pesanan processing yang sudah dibayar online', function () {
    $order = orderIn(S::Processing);

    $this->machine->transition($order, S::Cancelled, null, 'x');
})->throws(InvalidOrderTransition::class, 'Gunakan fitur refund');

it('mengizinkan pembatalan paid/processing lewat refund', function () {
    $order = orderIn(S::Paid);

    $this->machine->transition($order, S::Cancelled, superAdmin(), 'Refund', viaRefund: true);

    expect($order->status)->toBe(S::Cancelled);
    expect(fn () => $this->machine->assertTransition(orderIn(S::Completed), S::Cancelled, viaRefund: true))
        ->toThrow(InvalidOrderTransition::class, 'Refund hanya');
});

it('mencatat log, admin yang menangani, dan menyiarkan event ke channel outlet & order', function () {
    Event::fake([OrderStatusUpdated::class]);
    $admin = superAdmin();
    $order = orderIn(S::Paid);

    $this->machine->transition($order, S::Processing, $admin, 'Mulai diracik');

    expect($order->handled_by)->toBe($admin->id);
    $log = $order->statusLogs()->latest('id')->first();
    expect($log->only('from_status', 'to_status', 'changed_by', 'note'))
        ->toBe(['from_status' => 'paid', 'to_status' => 'processing', 'changed_by' => $admin->id, 'note' => 'Mulai diracik']);

    Event::assertDispatched(OrderStatusUpdated::class, function (OrderStatusUpdated $e) use ($order) {
        $channels = collect($e->broadcastOn())->map->name->all();

        return $e->from === S::Paid
            && $channels === ["private-outlet.{$order->outlet_id}", "private-order.{$order->code}"]
            && $e->broadcastAs() === 'order.status_updated'
            && $e->broadcastWith()['status'] === 'processing';
    });
});

it('mengirim notifikasi WhatsApp ke pelanggan', function () {
    $order = orderIn(S::Processing, FulfillmentType::Delivery);

    $this->machine->transition($order, S::Shipped);

    expect(whatsapp()->lastTo($order->customer_phone))->toContain('dalam perjalanan');
});

it('saat selesai: melunasi tunai, menambah sold_count, dan memberi poin', function () {
    $customer = customer();
    $order = orderIn(S::Processing, cash: true);
    $order->update(['customer_id' => $customer->id, 'total' => 50000, 'subtotal' => 50000]);
    $item = OrderItem::factory()->create(['order_id' => $order->id, 'qty' => 2]);

    $this->machine->transition($order, S::Completed);

    expect($order->payments()->first()->status)->toBe(PaymentStatus::Paid)
        ->and($item->product->fresh()->sold_count)->toBe(2)
        ->and($customer->fresh()->points_balance)->toBe(5);
});

it('canTransition memberi jawaban boolean', function () {
    expect($this->machine->canTransition(orderIn(S::Paid), S::Processing))->toBeTrue()
        ->and($this->machine->canTransition(orderIn(S::Paid), S::Shipped))->toBeFalse();
});
