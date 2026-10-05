<?php

namespace App\Http\Resources\Finance;

use App\Models\CashEntry;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin CashEntry */
class CashEntryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'outlet_id' => $this->outlet_id,
            'date' => $this->date->toDateString(),
            'type' => $this->type->value,
            'category' => $this->category->value,
            'category_label' => $this->category->label(),
            'description' => $this->description,
            'amount' => $this->amount,
            'method' => $this->method->value,
            'method_label' => $this->method->bookLabel(),
            'bank' => $this->bank,
            'counterparty' => $this->counterparty,
            'note' => $this->note,
            'source' => $this->source->value,
            'stock_purchase_id' => $this->stock_purchase_id,
            'created_by' => $this->creator ? ['id' => $this->creator->id, 'name' => $this->creator->name] : null,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
