<?php

namespace App\Services;

final readonly class DeliveryQuote
{
    public function __construct(
        public float $distanceKm,
        public int $fee,
        public float $radiusKm,
        public bool $withinRadius,
    ) {}

    public function toArray(): array
    {
        return [
            'distance_km' => $this->distanceKm,
            'fee' => $this->fee,
            'radius_km' => $this->radiusKm,
            'within_radius' => $this->withinRadius,
        ];
    }
}
