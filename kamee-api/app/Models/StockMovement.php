<?php

namespace App\Models;

use App\Enums\StockMovementType;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockMovement extends Model
{
    protected $fillable = [
        'ingredient_id', 'type', 'qty', 'unit_cost', 'reference', 'note', 'order_id', 'stock_purchase_id', 'created_by',
    ];

    protected function casts(): array
    {
        return [
            'type' => StockMovementType::class,
            'qty' => 'float',
            'unit_cost' => 'float',
        ];
    }

    public function ingredient(): BelongsTo
    {
        return $this->belongsTo(Ingredient::class)->withTrashed();
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
