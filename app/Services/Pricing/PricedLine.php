<?php

namespace App\Services\Pricing;

use App\Models\Option;
use App\Models\Product;

final readonly class PricedLine
{
    /** @param list<Option> $options */
    public function __construct(
        public Product $product,
        public int $qty,
        public int $unitPrice,
        public array $options,
        public ?string $note,
    ) {}

    public function subtotal(): int
    {
        return $this->unitPrice * $this->qty;
    }

    public function toArray(): array
    {
        return [
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'qty' => $this->qty,
            'base_price' => $this->product->base_price,
            'unit_price' => $this->unitPrice,
            'subtotal' => $this->subtotal(),
            'options' => array_map(fn (Option $o) => [
                'id' => $o->id, 'name' => $o->name, 'group' => $o->group?->name, 'price_delta' => $o->price_delta,
            ], $this->options),
            'note' => $this->note,
        ];
    }
}
