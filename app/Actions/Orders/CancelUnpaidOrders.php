<?php

namespace App\Actions\Orders;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Models\Order;
use App\Services\OrderStateMachine;
use App\Services\PaymentService;
use App\Services\SettingService;
use Illuminate\Support\Facades\Log;

/**
 * Batalkan pesanan non-tunai yang belum dibayar melewati batas waktu (default 15 menit).
 * Sebelum membatalkan, status pembayaran online dicek ulang ke penyedia (webhook bisa terlambat).
 */
class CancelUnpaidOrders
{
    public function __construct(
        private readonly OrderStateMachine $stateMachine,
        private readonly PaymentService $payments,
        private readonly SettingService $settings,
    ) {}

    public function __invoke(): int
    {
        $minutes = $this->settings->int('payment_timeout_minutes');
        $cancelled = 0;

        Order::query()->withoutGlobalScopes()
            ->where('status', OrderStatus::Pending)
            ->where('created_at', '<=', now()->subMinutes($minutes))
            ->whereDoesntHave('payments', fn ($q) => $q->where('method', PaymentMethod::Cash))
            ->chunkById(100, function ($orders) use (&$cancelled, $minutes) {
                foreach ($orders as $order) {
                    foreach ($order->payments()->where('status', PaymentStatus::Pending)->get() as $payment) {
                        $this->payments->reconcile($payment);
                    }

                    $order->refresh();
                    if ($order->status !== OrderStatus::Pending) {
                        continue;
                    }

                    try {
                        $this->stateMachine->transition($order, OrderStatus::Cancelled, null,
                            "Dibatalkan otomatis: pembayaran melewati batas {$minutes} menit.");
                        $cancelled++;
                    } catch (\Throwable $e) {
                        Log::warning('Gagal membatalkan pesanan otomatis', ['order' => $order->code, 'error' => $e->getMessage()]);
                    }
                }
            });

        return $cancelled;
    }
}
