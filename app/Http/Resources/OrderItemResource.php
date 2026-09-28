<?php

namespace App\Http\Resources;

use App\Models\OrderItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin OrderItem */
class OrderItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'product_id' => $this->product_id,
            'product_name' => $this->product_name,
            'unit_price' => $this->unit_price,
            'qty' => $this->qty,
            'subtotal' => $this->subtotal,
            'note' => $this->note,
            'options' => $this->whenLoaded('options', fn () => $this->options->map(fn ($o) => [
                'name' => $o->option_name,
                'price_delta' => $o->price_delta,
            ])),
        ];
    }
}
