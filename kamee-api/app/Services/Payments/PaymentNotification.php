<?php

namespace App\Services\Payments;

use App\Enums\PaymentStatus;

final readonly class PaymentNotification
{
    public function __construct(
        public string $provider,
        public string $reference,
        public PaymentStatus $status,
        public int $amount,
        public array $raw = [],
    ) {}
}
