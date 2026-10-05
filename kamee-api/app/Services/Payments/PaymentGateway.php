<?php

namespace App\Services\Payments;

use App\Exceptions\InvalidWebhookSignature;
use App\Models\Payment;
use Illuminate\Http\Request;

interface PaymentGateway
{
    /** Nama penyedia, disimpan di payments.provider dan dipakai di URL webhook. */
    public function name(): string;

    /** Buat transaksi di penyedia (QRIS / e-wallet / VA). */
    public function charge(ChargeRequest $request): ChargeResult;

    /**
     * Verifikasi signature lalu terjemahkan payload webhook.
     *
     * @throws InvalidWebhookSignature
     */
    public function parseWebhook(Request $request): PaymentNotification;

    /** Ambil status terbaru transaksi (rekonsiliasi). */
    public function status(string $reference): PaymentNotification;

    public function refund(Payment $payment, int $amount, string $reason): bool;
}
