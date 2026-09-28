<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PromotionUsage extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['promotion_id', 'order_id', 'customer_id', 'discount_amount'];

    protected function casts(): array
    {
        return ['discount_amount' => 'integer'];
    }

    public function promotion(): BelongsTo
    {
        return $this->belongsTo(Promotion::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class)->withoutGlobalScopes();
    }
}
