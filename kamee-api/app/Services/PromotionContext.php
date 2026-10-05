<?php

namespace App\Services;

use App\Models\Customer;
use App\Services\Pricing\PricedLine;

final readonly class PromotionContext
{
    /** @param list<PricedLine> $lines Kosong bila divalidasi di luar checkout (mis. cek voucher). */
    public function __construct(
        public int $subtotal,
        public ?int $outletId = null,
        public array $lines = [],
        public int $deliveryFee = 0,
        public ?Customer $customer = null,
        public ?string $customerPhone = null,
    ) {}
}
