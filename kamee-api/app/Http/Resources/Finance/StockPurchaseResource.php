<?php

namespace App\Http\Resources\Finance;

use App\Models\StockPurchase;
use App\Models\StockPurchaseItem;
use App\Support\Qty;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin StockPurchase */
class StockPurchaseResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'outlet_id' => $this->outlet_id,
            'date' => $this->date->toDateString(),
            'supplier' => $this->supplier,
            'method' => $this->method->value,
            'method_label' => $this->method->bookLabel(),
            'bank' => $this->bank,
            'note' => $this->note,
            'total' => $this->total,
            'items' => $this->items->map(fn (StockPurchaseItem $item) => [
                'id' => $item->id,
                'ingredient_id' => $item->ingredient_id,
                'ingredient_name' => $item->ingredient?->name,
                'kind' => $item->ingredient?->kind->value,
                'unit' => $item->ingredient?->unit->value,
                'pack_label' => $item->ingredient?->pack_label,
                'packs' => Qty::num($item->packs),
                'pack_price' => $item->pack_price,
                'pack_size' => Qty::num($item->pack_size),
                'qty' => Qty::num($item->qty),
                'subtotal' => $item->subtotal,
            ])->values(),
            'cash_entry_id' => $this->cashEntry?->id,
            'created_by' => $this->creator ? ['id' => $this->creator->id, 'name' => $this->creator->name] : null,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
