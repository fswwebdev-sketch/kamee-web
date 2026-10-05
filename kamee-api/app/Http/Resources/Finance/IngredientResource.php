<?php

namespace App\Http\Resources\Finance;

use App\Models\Ingredient;
use App\Support\Qty;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Ingredient */
class IngredientResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'outlet_id' => $this->outlet_id,
            'name' => $this->name,
            'kind' => $this->kind->value,
            'unit' => $this->unit->value,
            'pack_label' => $this->pack_label,
            'pack_size' => Qty::num($this->pack_size),
            'pack_price' => $this->pack_price,
            'cost_per_unit' => Qty::num($this->costPerUnit(), 2),
            'stock_qty' => Qty::num($this->stock_qty),
            'min_stock' => Qty::num($this->min_stock),
            'low_stock' => $this->isLowStock(),
            'note' => $this->note,
            'is_active' => $this->is_active,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
