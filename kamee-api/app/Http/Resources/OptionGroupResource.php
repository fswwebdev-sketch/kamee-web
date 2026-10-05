<?php

namespace App\Http\Resources;

use App\Models\OptionGroup;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin OptionGroup */
class OptionGroupResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'type' => $this->type->value,
            'is_required' => $this->is_required,
            'options' => OptionResource::collection($this->whenLoaded('options')),
        ];
    }
}
