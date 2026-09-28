<?php

namespace App\Services\Payments;

use App\Enums\PaymentMethod;
use App\Models\Order;
use Carbon\CarbonInterface;

final readonly class ChargeRequest
{
    public function __construct(
        public Order $order,
        public PaymentMethod $method,
        public string $reference,
        public int $amount,
        public CarbonInterface $expiresAt,
        public ?string $channel = null, // gopay|shopeepay untuk e-wallet, bca|bni|bri|permata|cimb untuk VA
    ) {}

    public function expiryMinutes(): int
    {
        return max(1, (int) ceil(now()->diffInSeconds($this->expiresAt, false) / 60));
    }
}
