<?php

namespace App\Services\Pricing;

final readonly class CartItem
{
    /** @param list<int> $optionIds */
    public function __construct(
        public int $productId,
        public int $qty,
        public array $optionIds = [],
        public ?string $note = null,
    ) {}

    public static function fromArray(array $item): self
    {
        return new self(
            (int) $item['product_id'],
            (int) $item['qty'],
            array_values(array_unique(array_map('intval', $item['option_ids'] ?? []))),
            $item['note'] ?? null,
        );
    }
}
