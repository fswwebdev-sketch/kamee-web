<?php

namespace App\Http\Resources\Admin;

use App\Http\Resources\ProductResource;
use Illuminate\Http\Request;

/** Produk untuk panel admin: + deskripsi lengkap, ID grup opsi, dan outlet yang menandai habis. */
class AdminProductResource extends ProductResource
{
    public function toArray(Request $request): array
    {
        return parent::toArray($request) + [
            'category_id' => $this->category_id,
            'description' => $this->description,
            'composition' => $this->composition,
            'calories' => $this->calories,
            'option_group_ids' => $this->whenLoaded('optionGroups', fn () => $this->optionGroups->pluck('id')->values()),
            'unavailable_outlet_ids' => $this->whenLoaded('outlets', fn () => $this->outlets
                ->filter(fn ($outlet) => ! $outlet->pivot->is_available)->pluck('id')->values()),
            'deleted_at' => $this->deleted_at?->toIso8601String(),
        ];
    }
}
