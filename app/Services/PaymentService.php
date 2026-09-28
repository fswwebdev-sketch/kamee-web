<?php

namespace App\Services;

use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Exceptions\BusinessException;
use App\Models\Order;
use App\Models\Payment;
use App\Models\User;
use App\Services\Payments\ChargeRequest;
use App\Services\Payments\PaymentGatewayManager;
use App\Services\Payments\PaymentNotification;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PaymentService
{
    public function __construct(
        private readonly PaymentGatewayManager $gateways,
        private readonly OrderStateMachine $stateMachine,
        private readonly SettingService $settings,
    ) {}

    /** Batas waktu bayar sebuah pesanan (created_at + payment_timeout_minutes). */
    public function deadline(Order $order)
    {
        return $order->created_at->copy()->addMinutes($this->settings->int('payment_timeout_minutes'));
    }

    /**
     * Buat transaksi pembayaran untuk pesanan pending.
     * Transaksi pending yang masih berlaku dengan metode sama dipakai ulang (tidak membuat tagihan ganda).
     */
    public function pay(Order $order, PaymentMethod $method, ?string $channel = null): Payment
    {
        if ($order->status !== OrderStatus::Pending) {
            throw BusinessException::field('order', 'Pesanan tidak dalam status menunggu pembayaran.');
        }

        if ($method === PaymentMethod::Cash) {
            return $this->payWithCash($order);
        }

        $deadline = $this->deadline($order);
        if ($deadline->isPast()) {
            throw BusinessException::field('order', 'Batas waktu pembayaran sudah habis. Silakan buat pesanan baru.');
        }

        return Cache::lock("payment:create:{$order->id}", 20)->block(10, function () use ($order, $method, $channel, $deadline) {
            $existing = $order->payments()
                ->where('method', $method)
                ->where('status', PaymentStatus::Pending)
                ->where('expires_at', '>', now())
                ->latest('id')
                ->first();

            if ($existing && ($channel === null || ($existing->raw_payload['channel'] ?? null) === $channel)) {
                return $existing;
            }

            $gateway = $this->gateways->default();
            $attempt = $order->payments()->count() + 1;
            $result = $gateway->charge(new ChargeRequest(
                order: $order,
                method: $method,
                reference: "{$order->code}-{$attempt}",
                amount: $order->total,
                expiresAt: $deadline,
                channel: $channel,
            ));

            return DB::transaction(function () use ($order, $method, $channel, $gateway, $result, $deadline) {
                // Tagihan lain yang masih menunggu tidak dipakai lagi.
                $order->payments()->where('status', PaymentStatus::Pending)->update(['status' => PaymentStatus::Expired]);

                return $order->payments()->create([
                    'method' => $method,
                    'provider' => $gateway->name(),
                    'provider_ref' => $result->reference,
                    'amount' => $order->total,
                    'status' => PaymentStatus::Pending,
                    'qr_string' => $result->qrString,
                    'va_number' => $result->vaNumber,
                    'expires_at' => $result->expiresAt ?? $deadline,
                    'raw_payload' => $result->raw + ['channel' => $channel, 'deeplink' => $result->deeplink],
                ]);
            });
        });
    }

    /** Tunai: pesanan langsung diproses (pending → processing), dibayar di kasir. */
    private function payWithCash(Order $order): Payment
    {
        return DB::transaction(function () use ($order) {
            $payment = $order->payments()->create([
                'method' => PaymentMethod::Cash,
                'provider' => 'cash',
                'amount' => $order->total,
                'status' => PaymentStatus::Pending,
            ]);

            $this->stateMachine->transition($order, OrderStatus::Processing, null, 'Bayar tunai di outlet');

            return $payment;
        });
    }

    /**
     * Terapkan notifikasi status pembayaran (webhook / rekonsiliasi). Idempoten:
     * notifikasi berulang atau yang lebih lama tidak mengubah apa pun.
     *
     * @return string Ringkasan hasil pemrosesan.
     */
    public function applyNotification(PaymentNotification $notification): string
    {
        return Cache::lock("payment:notify:{$notification->reference}", 30)->block(10, function () use ($notification) {
            return DB::transaction(function () use ($notification) {
                $payment = Payment::query()
                    ->where('provider', $notification->provider)
                    ->where('provider_ref', $notification->reference)
                    ->lockForUpdate()
                    ->first();

                if ($payment === null) {
                    throw new BusinessException('Transaksi pembayaran tidak ditemukan.', [], 404);
                }

                if ($payment->status === $notification->status) {
                    return 'Notifikasi sudah pernah diproses.';
                }

                // Status final tidak mundur (mis. paid tidak bisa menjadi expired), kecuali refund.
                if ($payment->status->isFinal()
                    && ! ($payment->status === PaymentStatus::Paid && $notification->status === PaymentStatus::Refunded)) {
                    return 'Status pembayaran sudah final, notifikasi diabaikan.';
                }

                if ($notification->status === PaymentStatus::Pending) {
                    return 'Pembayaran masih menunggu.';
                }

                if ($notification->status === PaymentStatus::Paid && $notification->amount !== $payment->amount) {
                    Log::warning('Nominal pembayaran tidak cocok', [
                        'reference' => $notification->reference, 'expected' => $payment->amount, 'received' => $notification->amount,
                    ]);

                    throw new BusinessException('Nominal pembayaran tidak sesuai.', [], 422);
                }

                $payment->status = $notification->status;
                $payment->raw_payload = array_merge($payment->raw_payload ?? [], ['last_notification' => $notification->raw]);
                if ($notification->status === PaymentStatus::Paid) {
                    $payment->paid_at = now();
                }
                $payment->save();

                if ($notification->status === PaymentStatus::Paid) {
                    $this->markOrderPaid($payment);
                }

                return 'Notifikasi diproses.';
            });
        });
    }

    private function markOrderPaid(Payment $payment): void
    {
        $order = $payment->order;

        if ($order->status === OrderStatus::Pending) {
            $this->stateMachine->transition($order, OrderStatus::Paid, null, 'Pembayaran '.$payment->method->label().' diterima');

            return;
        }

        // Pembayaran terlambat untuk pesanan yang sudah dibatalkan otomatis → perlu refund manual.
        Log::warning('Pembayaran diterima untuk pesanan yang tidak lagi pending', [
            'order' => $order->code, 'status' => $order->status->value, 'reference' => $payment->provider_ref,
        ]);
    }

    /** Refund & batalkan pesanan yang sudah dibayar (khusus Super Admin). */
    public function refund(Order $order, User $actor, string $reason): Order
    {
        $payment = $order->payments()->where('status', PaymentStatus::Paid)->latest('id')->first();

        if ($payment === null && $order->status !== OrderStatus::Processing) {
            throw BusinessException::field('order', 'Tidak ada pembayaran lunas yang bisa direfund.');
        }

        $this->stateMachine->assertTransition($order, OrderStatus::Cancelled, viaRefund: true);

        if ($payment !== null && $payment->method->isOnline()) {
            $ok = $this->gateways->driver($payment->provider)->refund($payment, $payment->amount, $reason);

            if (! $ok) {
                throw new BusinessException('Refund ditolak oleh penyedia pembayaran.', [], 502);
            }
        }

        return DB::transaction(function () use ($order, $payment, $actor, $reason) {
            $payment?->update(['status' => PaymentStatus::Refunded]);

            return $this->stateMachine->transition($order, OrderStatus::Cancelled, $actor, "Refund: {$reason}", viaRefund: true);
        });
    }

    /**
     * Rekonsiliasi: tanyakan status pembayaran online yang masih pending ke penyedia.
     *
     * @return int jumlah pembayaran yang statusnya berubah
     */
    public function reconcilePending(int $olderThanMinutes = 1): int
    {
        $changed = 0;

        Payment::query()
            ->where('status', PaymentStatus::Pending)
            ->where('method', '!=', PaymentMethod::Cash)
            ->where('created_at', '<=', now()->subMinutes($olderThanMinutes))
            ->where('created_at', '>=', now()->subDay())
            ->chunkById(100, function ($payments) use (&$changed) {
                foreach ($payments as $payment) {
                    $changed += (int) $this->reconcile($payment);
                }
            });

        return $changed;
    }

    public function reconcile(Payment $payment): bool
    {
        try {
            $notification = $this->gateways->driver($payment->provider)->status($payment->provider_ref);
            $before = $payment->status;
            $this->applyNotification($notification);

            return $payment->fresh()->status !== $before;
        } catch (\Throwable $e) {
            Log::warning('Rekonsiliasi pembayaran gagal', ['reference' => $payment->provider_ref, 'error' => $e->getMessage()]);

            return false;
        }
    }
}
