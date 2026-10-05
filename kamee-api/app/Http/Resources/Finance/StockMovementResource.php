<?php

namespace App\Http\Resources\Finance;

use App\Models\StockMovement;
use App\Support\Qty;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin StockMovement */
class StockMovementResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'ingredient_id' => $this->ingredient_id,
            'type' => $this->type->value,
            'type_label' => $this->type->label(),
            'qty' => Qty::num($this->qty),
            'unit_cost' => Qty::num($this->unit_cost, 4),
            'reference' => $this->reference,
            'note' => $this->note,
            'created_by' => $this->creator ? ['id' => $this->creator->id, 'name' => $this->creator->name] : null,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
