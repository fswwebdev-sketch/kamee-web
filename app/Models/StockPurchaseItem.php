<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockPurchaseItem extends Model
{
    public $timestamps = false;

    protected $fillable = ['stock_purchase_id', 'ingredient_id', 'packs', 'pack_price', 'pack_size', 'qty', 'subtotal'];

    protected function casts(): array
    {
        return [
            'packs' => 'float',
            'pack_price' => 'integer',
            'pack_size' => 'float',
            'qty' => 'float',
            'subtotal' => 'integer',
        ];
    }

    public function ingredient(): BelongsTo
    {
        return $this->belongsTo(Ingredient::class)->withTrashed();
    }
}
