<?php

namespace App\Services;

use App\Models\Promotion;

final readonly class PromotionEvaluation
{
    public function __construct(
        public Promotion $promotion,
        public int $discount,
        public string $message,
    ) {}
}
