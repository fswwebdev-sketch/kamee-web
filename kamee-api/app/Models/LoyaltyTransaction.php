<?php

namespace App\Models;

use App\Enums\LoyaltyTransactionType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LoyaltyTransaction extends Model
{
    use HasFactory;

    public const UPDATED_AT = null;

    protected $fillable = ['customer_id', 'order_id', 'type', 'points', 'balance_after', 'expires_at', 'note'];

    protected function casts(): array
    {
        return [
            'type' => LoyaltyTransactionType::class,
            'points' => 'integer',
            'balance_after' => 'integer',
            'expires_at' => 'datetime',
        ];
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class)->withoutGlobalScopes();
    }
}
