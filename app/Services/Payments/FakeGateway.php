<?php

namespace App\Services\Payments;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Exceptions\InvalidWebhookSignature;
use App\Models\Payment;
use Illuminate\Http\Request;

/**
 * Simulator pembayaran untuk pengembangan lokal (PAYMENT_GATEWAY=fake).
 *
 * Webhook: POST /api/v1/webhooks/payments/fake dengan body {reference, status, amount}
 * dan header X-Signature = HMAC-SHA256(body, APP_KEY).
 */
class FakeGateway implements PaymentGateway
{
    /** @var array<string, PaymentStatus> Status yang dikembalikan status() — dapat diatur di tes. */
    public static array $statuses = [];

    public function __construct(private readonly string $secret) {}

    public function name(): string
    {
        return 'fake';
    }

    public function charge(ChargeRequest $request): ChargeResult
    {
        return new ChargeResult(
            reference: $request->reference,
            qrString: $request->method === PaymentMethod::Qris ? '00020101021226FAKEQRIS'.$request->reference.'5303360540'.$request->amount : null,
            vaNumber: $request->method === PaymentMethod::BankTransfer ? '8808'.str_pad((string) $request->order->id, 10, '0', STR_PAD_LEFT) : null,
            deeplink: $request->method === PaymentMethod::EWallet ? 'https://simulator.kamee.test/pay/'.$request->reference : null,
            expiresAt: $request->expiresAt,
            raw: ['simulator' => true],
        );
    }

    public function sign(string $body): string
    {
        return hash_hmac('sha256', $body, $this->secret);
    }

    public function parseWebhook(Request $request): PaymentNotification
    {
        if (! hash_equals($this->sign($request->getContent()), (string) $request->header('X-Signature'))) {
            throw new InvalidWebhookSignature;
        }

        return new PaymentNotification(
            provider: $this->name(),
            reference: (string) $request->input('reference'),
            status: PaymentStatus::tryFrom((string) $request->input('status')) ?? PaymentStatus::Failed,
            amount: (int) $request->input('amount'),
            raw: $request->all(),
        );
    }

    public function status(string $reference): PaymentNotification
    {
        $payment = Payment::where('provider_ref', $reference)->first();

        return new PaymentNotification($this->name(), $reference, self::$statuses[$reference] ?? PaymentStatus::Pending, $payment?->amount ?? 0);
    }

    public function refund(Payment $payment, int $amount, string $reason): bool
    {
        return true;
    }
}
