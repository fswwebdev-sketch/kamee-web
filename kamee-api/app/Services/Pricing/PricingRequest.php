<?php

namespace App\Services\Pricing;

use App\Enums\FulfillmentType;
use App\Models\Customer;

final readonly class PricingRequest
{
    /** @param list<CartItem> $items */
    public function __construct(
        public int $outletId,
        public array $items,
        public FulfillmentType $fulfillment = FulfillmentType::Pickup,
        public ?float $lat = null,
        public ?float $lng = null,
        public ?string $promoCode = null,
        public int $redeemPoints = 0,
        public ?Customer $customer = null,
        public ?string $customerPhone = null,
    ) {}
}
