<?php

namespace App\Services;

use App\Enums\FulfillmentType;
use App\Enums\OrderChannel;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Events\OrderStatusUpdated;
use App\Exceptions\InvalidOrderTransition;
use App\Jobs\SendWhatsAppMessage;
use App\Models\Order;
use App\Models\OrderStatusLog;
use App\Models\Product;
use App\Models\User;
use App\Services\Finance\StockService;
use App\Services\WhatsApp\OrderMessages;
use Illuminate\Support\Facades\DB;

/**
 * State machine status pesanan.
 *
 *   pending ──► paid ──► processing ──► shipped ──► completed
 *      │                    │    └──────(non-antar)──► completed
 *      ├──(tunai)──► processing
 *      └──► cancelled ◄─────┘   (paid/processing → cancelled hanya lewat refund)
 */
class OrderStateMachine
{
    public function __construct(
        private readonly PromotionService $promotions,
        private readonly LoyaltyService $loyalty,
        private readonly OrderMessages $messages,
        private readonly StockService $stock,
    ) {}

    public function canTransition(Order $order, OrderStatus $to, bool $viaRefund = false): bool
    {
        try {
            $this->assertTransition($order, $to, $viaRefund);

            return true;
        } catch (InvalidOrderTransition) {
            return false;
        }
    }

    public function assertTransition(Order $order, OrderStatus $to, bool $viaRefund = false): void
    {
        $from = $order->status;

        if ($from === $to) {
            throw InvalidOrderTransition::between($from, $to, "Pesanan sudah berstatus \"{$to->label()}\".");
        }

        if ($viaRefund) {
            if ($to !== OrderStatus::Cancelled || ! in_array($from, [OrderStatus::Paid, OrderStatus::Processing, OrderStatus::Shipped], true)) {
                throw InvalidOrderTransition::between($from, $to, 'Refund hanya untuk pesanan yang sudah dibayar dan belum selesai.');
            }

            return;
        }

        if (! $from->canTransitionTo($to)) {
            throw InvalidOrderTransition::between($from, $to);
        }

        $isCash = $order->isCash();

        match (true) {
            $from === OrderStatus::Pending && $to === OrderStatus::Processing && ! $isCash => throw InvalidOrderTransition::between(
                $from, $to, 'Pesanan non-tunai harus dibayar terlebih dahulu sebelum diproses.'),
            $to === OrderStatus::Shipped && $order->fulfillment !== FulfillmentType::Delivery => throw InvalidOrderTransition::between(
                $from, $to, 'Hanya pesanan antar yang dapat diubah ke status dikirim.'),
            $from === OrderStatus::Processing && $to === OrderStatus::Completed && $order->fulfillment === FulfillmentType::Delivery => throw InvalidOrderTransition::between(
                $from, $to, 'Pesanan antar harus berstatus dikirim sebelum selesai.'),
            $from === OrderStatus::Processing && $to === OrderStatus::Cancelled && $order->paid_at !== null && ! $isCash => throw InvalidOrderTransition::between(
                $from, $to, 'Pesanan sudah dibayar online. Gunakan fitur refund untuk membatalkan.'),
            default => null,
        };
    }

    /**
     * Ubah status pesanan beserta efek sampingnya, dicatat di order_status_logs dan disiarkan.
     */
    public function transition(Order $order, OrderStatus $to, ?User $actor = null, ?string $note = null, bool $viaRefund = false): Order
    {
        return $this->apply($order, $to, $actor, $note, fn (Order $locked) => $this->assertTransition($locked, $to, $viaRefund));
    }

    /**
     * Pesanan kasir (POS) yang sudah dibayar langsung diselesaikan (paid → completed),
     * tanpa melewati status diproses.
     */
    public function completeAtCounter(Order $order, ?User $actor = null, ?string $note = null): Order
    {
        return $this->apply($order, OrderStatus::Completed, $actor, $note, function (Order $locked) {
            if ($locked->status !== OrderStatus::Paid || $locked->channel !== OrderChannel::Pos) {
                throw InvalidOrderTransition::between($locked->status, OrderStatus::Completed, 'Hanya pesanan kasir yang sudah dibayar yang dapat langsung diselesaikan.');
            }
        });
    }

    /** @param \Closure(Order): void $guard */
    private function apply(Order $order, OrderStatus $to, ?User $actor, ?string $note, \Closure $guard): Order
    {
        return DB::transaction(function () use ($order, $to, $actor, $note, $guard) {
            /** @var Order $locked */
            $locked = Order::query()->withoutGlobalScopes()->lockForUpdate()->findOrFail($order->id);
            $from = $locked->status;

            $guard($locked);

            $locked->status = $to;
            if ($actor !== null) {
                $locked->handled_by = $actor->id;
            }

            match ($to) {
                OrderStatus::Paid => $locked->paid_at ??= now(),
                OrderStatus::Completed => $this->complete($locked),
                OrderStatus::Cancelled => $this->cancel($locked, $note),
                default => null,
            };

            // Potong stok bahan saat pesanan terbayar/berjalan; kembalikan saat dibatalkan (idempoten).
            $this->stock->syncOrder($locked, $to, $actor);

            $locked->save();

            OrderStatusLog::create([
                'order_id' => $locked->id,
                'from_status' => $from->value,
                'to_status' => $to->value,
                'changed_by' => $actor?->id,
                'note' => $note,
            ]);

            OrderStatusUpdated::dispatch($locked, $from, $note);

            if (filled($locked->customer_phone) && $text = $this->messages->statusUpdated($locked)) {
                SendWhatsAppMessage::dispatch($locked->customer_phone, $text);
            }

            $order->setRawAttributes($locked->getAttributes(), true);

            return $order;
        });
    }

    private function complete(Order $order): void
    {
        $order->completed_at = now();
        $order->paid_at ??= now();

        // Pembayaran tunai dianggap lunas saat pesanan selesai.
        $order->payments()->where('method', PaymentMethod::Cash)->where('status', PaymentStatus::Pending)
            ->update(['status' => PaymentStatus::Paid, 'paid_at' => now()]);

        foreach ($order->items()->get(['product_id', 'qty']) as $item) {
            if ($item->product_id) {
                Product::withTrashed()->whereKey($item->product_id)->increment('sold_count', $item->qty);
            }
        }

        $this->loyalty->earnForOrder($order);
    }

    private function cancel(Order $order, ?string $reason): void
    {
        $order->cancelled_reason = $reason ?? 'Dibatalkan';

        $order->payments()->where('status', PaymentStatus::Pending)->update(['status' => PaymentStatus::Expired]);

        $this->promotions->releaseUsage($order);
        $this->loyalty->refundRedeemForOrder($order);
    }
}
