<?php

namespace App\Services\Payments;

use Carbon\CarbonInterface;

final readonly class ChargeResult
{
    public function __construct(
        public string $reference,
        public ?string $qrString = null,
        public ?string $vaNumber = null,
        public ?string $deeplink = null,
        public ?CarbonInterface $expiresAt = null,
        public array $raw = [],
    ) {}
}
