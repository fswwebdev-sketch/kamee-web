<?php

namespace App\Services\Payments;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Exceptions\BusinessException;
use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * QRIS statis (GoPay Merchant) dengan konfirmasi manual (PAYMENT_GATEWAY=manual).
 *
 * Pelanggan memindai gambar QRIS statis dan memasukkan nominal sendiri; tidak ada
 * webhook maupun API status. Admin outlet mengonfirmasi pembayaran lewat
 * POST /api/v1/admin/orders/{order}/confirm-payment.
 */
class ManualQrisGateway implements PaymentGateway
{
    public function __construct(
        private readonly ?string $imageUrl,
        private readonly string $merchantName,
        private readonly string $nmid,
    ) {}

    public function name(): string
    {
        return 'manual';
    }

    public function charge(ChargeRequest $request): ChargeResult
    {
        if ($request->method !== PaymentMethod::Qris) {
            throw new BusinessException('Metode pembayaran ini belum tersedia.', [], 422);
        }

        return new ChargeResult(
            reference: $request->reference,
            expiresAt: $request->expiresAt,
            raw: [
                'manual' => true,
                'merchant_name' => $this->merchantName,
                'nmid' => $this->nmid,
                'qris_image_url' => $this->imageUrl,
            ],
        );
    }

    /** QRIS statis tidak mengirim webhook. */
    public function parseWebhook(Request $request): PaymentNotification
    {
        throw new BusinessException('Penyedia pembayaran tidak mendukung webhook.', [], 404);
    }

    /** Tidak ada API status: kembalikan status yang tersimpan (rekonsiliasi tidak mengubah apa pun). */
    public function status(string $reference): PaymentNotification
    {
        $payment = Payment::where('provider', $this->name())->where('provider_ref', $reference)->first();

        return new PaymentNotification($this->name(), $reference, $payment?->status ?? PaymentStatus::Pending, $payment?->amount ?? 0);
    }

    /** Dana dikembalikan manual di luar sistem (transfer balik oleh pemilik); di sini hanya dicatat. */
    public function refund(Payment $payment, int $amount, string $reason): bool
    {
        Log::info('Refund QRIS manual: kembalikan dana di luar sistem', [
            'reference' => $payment->provider_ref, 'amount' => $amount, 'reason' => $reason,
        ]);

        return true;
    }
}
