<?php

namespace App\Services\Pricing;

use App\Models\Outlet;
use App\Models\Promotion;

final readonly class PricingResult
{
    /** @param list<PricedLine> $lines */
    public function __construct(
        public Outlet $outlet,
        public array $lines,
        public int $subtotal,
        public int $discount,
        public ?Promotion $promotion,
        public int $pointsRedeemed,
        public int $pointsValue,
        public int $deliveryFee,
        public ?float $deliveryDistanceKm,
        public int $serviceFee,
        public int $total,
    ) {}

    public function toArray(): array
    {
        return [
            'items' => array_map(fn (PricedLine $l) => $l->toArray(), $this->lines),
            'subtotal' => $this->subtotal,
            'discount' => $this->discount,
            'promotion' => $this->promotion ? [
                'id' => $this->promotion->id, 'code' => $this->promotion->code, 'name' => $this->promotion->name,
            ] : null,
            'points_redeemed' => $this->pointsRedeemed,
            'points_value' => $this->pointsValue,
            'delivery_fee' => $this->deliveryFee,
            'delivery_distance_km' => $this->deliveryDistanceKm,
            'service_fee' => $this->serviceFee,
            'total' => $this->total,
        ];
    }
}
