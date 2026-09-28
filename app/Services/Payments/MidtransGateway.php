<?php

namespace App\Services\Payments;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use App\Exceptions\InvalidWebhookSignature;
use App\Exceptions\PaymentGatewayException;
use App\Models\Payment;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\Response;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Midtrans Core API: QRIS, e-wallet (GoPay/ShopeePay), dan Virtual Account.
 *
 * @see https://docs.midtrans.com/reference/core-api
 */
class MidtransGateway implements PaymentGateway
{
    public const BANKS = ['bca', 'bni', 'bri', 'cimb', 'permata'];

    public const EWALLETS = ['gopay', 'shopeepay'];

    public function __construct(
        private readonly string $serverKey,
        private readonly string $baseUrl,
        private readonly ?string $callbackUrl = null,
    ) {}

    public function name(): string
    {
        return 'midtrans';
    }

    public function charge(ChargeRequest $request): ChargeResult
    {
        $payload = [
            'transaction_details' => ['order_id' => $request->reference, 'gross_amount' => $request->amount],
            'customer_details' => [
                'first_name' => $request->order->customer_name,
                'phone' => $request->order->customer_phone,
            ],
            'custom_expiry' => ['expiry_duration' => $request->expiryMinutes(), 'unit' => 'minute'],
        ] + $this->methodPayload($request);

        $response = $this->send(fn () => $this->http()->post('/v2/charge', $payload));
        $data = $response->json();

        if (! in_array((string) ($data['status_code'] ?? ''), ['200', '201'], true)) {
            throw new PaymentGatewayException($data['status_message'] ?? 'status tidak dikenal');
        }

        $actions = collect($data['actions'] ?? [])->keyBy('name');

        return new ChargeResult(
            reference: $request->reference,
            qrString: $data['qr_string'] ?? null,
            vaNumber: $data['va_numbers'][0]['va_number'] ?? $data['permata_va_number'] ?? null,
            deeplink: $actions->get('deeplink-redirect')['url'] ?? null,
            expiresAt: isset($data['expiry_time']) ? Carbon::parse($data['expiry_time'], 'Asia/Jakarta') : $request->expiresAt,
            raw: array_filter([
                'transaction_id' => $data['transaction_id'] ?? null,
                'qr_url' => $actions->get('generate-qr-code')['url'] ?? null,
                'deeplink' => $actions->get('deeplink-redirect')['url'] ?? null,
                'bank' => $data['va_numbers'][0]['bank'] ?? (isset($data['permata_va_number']) ? 'permata' : null),
                'charge_response' => $data,
            ]),
        );
    }

    public function parseWebhook(Request $request): PaymentNotification
    {
        $payload = $request->json()->all();

        foreach (['order_id', 'status_code', 'gross_amount', 'signature_key'] as $key) {
            if (! isset($payload[$key])) {
                throw new InvalidWebhookSignature;
            }
        }

        $expected = hash('sha512', $payload['order_id'].$payload['status_code'].$payload['gross_amount'].$this->serverKey);

        if (! hash_equals($expected, (string) $payload['signature_key'])) {
            throw new InvalidWebhookSignature;
        }

        return $this->toNotification($payload);
    }

    public function status(string $reference): PaymentNotification
    {
        $response = $this->send(fn () => $this->http()->get('/v2/'.rawurlencode($reference).'/status'));

        return $this->toNotification($response->json() + ['order_id' => $reference]);
    }

    public function refund(Payment $payment, int $amount, string $reason): bool
    {
        $response = $this->send(fn () => $this->http()->post('/v2/'.rawurlencode($payment->provider_ref).'/refund', [
            'refund_key' => $payment->provider_ref.'-refund',
            'amount' => $amount,
            'reason' => $reason,
        ]));

        return in_array((string) $response->json('status_code'), ['200', '201'], true);
    }

    /** Pemetaan status Midtrans → status pembayaran internal. */
    public static function mapStatus(string $transactionStatus, ?string $fraudStatus = null): PaymentStatus
    {
        return match ($transactionStatus) {
            'settlement' => PaymentStatus::Paid,
            'capture' => $fraudStatus === 'challenge' ? PaymentStatus::Pending : PaymentStatus::Paid,
            'pending', 'authorize' => PaymentStatus::Pending,
            'expire' => PaymentStatus::Expired,
            'refund', 'partial_refund' => PaymentStatus::Refunded,
            default => PaymentStatus::Failed, // cancel, deny, failure
        };
    }

    private function toNotification(array $payload): PaymentNotification
    {
        return new PaymentNotification(
            provider: $this->name(),
            reference: (string) $payload['order_id'],
            status: self::mapStatus((string) ($payload['transaction_status'] ?? 'failure'), $payload['fraud_status'] ?? null),
            amount: (int) round((float) ($payload['gross_amount'] ?? 0)),
            raw: $payload,
        );
    }

    private function methodPayload(ChargeRequest $request): array
    {
        return match ($request->method) {
            PaymentMethod::Qris => ['payment_type' => 'qris', 'qris' => ['acquirer' => 'gopay']],
            PaymentMethod::EWallet => match ($channel = $request->channel ?? 'gopay') {
                'shopeepay' => ['payment_type' => 'shopeepay', 'shopeepay' => ['callback_url' => $this->callback($request)]],
                default => ['payment_type' => 'gopay', 'gopay' => ['enable_callback' => true, 'callback_url' => $this->callback($request)]],
            },
            PaymentMethod::BankTransfer => ($bank = $request->channel ?? 'bca') === 'permata'
                ? ['payment_type' => 'permata']
                : ['payment_type' => 'bank_transfer', 'bank_transfer' => ['bank' => $bank]],
            PaymentMethod::Cash => throw new \LogicException('Pembayaran tunai tidak diproses gateway.'),
        };
    }

    private function callback(ChargeRequest $request): string
    {
        return rtrim((string) $this->callbackUrl, '/').'/'.$request->order->code;
    }

    private function http(): PendingRequest
    {
        return Http::baseUrl($this->baseUrl)
            ->withBasicAuth($this->serverKey, '')
            ->acceptJson()
            ->asJson()
            ->timeout(20);
    }

    /** @param callable(): Response $call */
    private function send(callable $call): Response
    {
        try {
            $response = $call();
        } catch (Throwable $e) {
            Log::error('Midtrans tidak dapat dihubungi: '.$e->getMessage());
            throw new PaymentGatewayException($e->getMessage());
        }

        if ($response->serverError()) {
            Log::error('Midtrans error', ['status' => $response->status(), 'body' => $response->body()]);
            throw new PaymentGatewayException('HTTP '.$response->status());
        }

        return $response;
    }
}
