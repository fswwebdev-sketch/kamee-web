<?php

namespace App\Models;

use App\Enums\PromotionType;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Promotion extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'code', 'name', 'type', 'value', 'min_spend', 'max_discount', 'quota',
        'per_customer_limit', 'starts_at', 'ends_at', 'outlet_id', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'type' => PromotionType::class,
            'value' => 'integer',
            'min_spend' => 'integer',
            'max_discount' => 'integer',
            'quota' => 'integer',
            'per_customer_limit' => 'integer',
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::saving(function (Promotion $promotion) {
            if ($promotion->code !== null) {
                $promotion->code = strtoupper(trim($promotion->code));
            }
        });
    }

    public function outlet(): BelongsTo
    {
        return $this->belongsTo(Outlet::class);
    }

    public function usages(): HasMany
    {
        return $this->hasMany(PromotionUsage::class);
    }

    /** Promo aktif dan berada dalam periode berlaku. */
    public function scopeRunning(Builder $query): void
    {
        $now = now();
        $query->where('is_active', true)
            ->where(fn ($q) => $q->whereNull('starts_at')->orWhere('starts_at', '<=', $now))
            ->where(fn ($q) => $q->whereNull('ends_at')->orWhere('ends_at', '>=', $now));
    }

    public function scopeForOutlet(Builder $query, ?int $outletId): void
    {
        $query->where(fn ($q) => $q->whereNull('outlet_id')->when($outletId, fn ($q) => $q->orWhere('outlet_id', $outletId)));
    }
}
