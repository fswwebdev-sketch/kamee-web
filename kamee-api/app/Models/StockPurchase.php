<?php

namespace App\Models;

use App\Enums\PaymentMethod;
use App\Models\Scopes\OutletScope;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[ScopedBy(OutletScope::class)]
class StockPurchase extends Model
{
    protected $fillable = ['outlet_id', 'date', 'supplier', 'method', 'bank', 'note', 'total', 'created_by'];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'method' => PaymentMethod::class,
            'total' => 'integer',
        ];
    }

    public function items(): HasMany
    {
        return $this->hasMany(StockPurchaseItem::class)->orderBy('id');
    }

    public function cashEntry(): HasOne
    {
        return $this->hasOne(CashEntry::class);
    }

    public function movements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
