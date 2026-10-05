<?php

namespace App\Models;

use App\Enums\IngredientKind;
use App\Enums\IngredientUnit;
use App\Models\Scopes\OutletScope;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Bahan baku / kemasan per outlet. stock_qty adalah cache jumlah semua mutasi stok
 * dan hanya diubah lewat StockService.
 */
#[ScopedBy(OutletScope::class)]
class Ingredient extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'outlet_id', 'name', 'kind', 'unit', 'pack_label', 'pack_size', 'pack_price', 'min_stock', 'note', 'is_active',
    ];

    protected $attributes = [
        'stock_qty' => 0,
        'is_active' => true,
    ];

    protected function casts(): array
    {
        return [
            'kind' => IngredientKind::class,
            'unit' => IngredientUnit::class,
            'pack_size' => 'float',
            'pack_price' => 'integer',
            'stock_qty' => 'float',
            'min_stock' => 'float',
            'is_active' => 'boolean',
        ];
    }

    public function outlet(): BelongsTo
    {
        return $this->belongsTo(Outlet::class);
    }

    public function movements(): HasMany
    {
        return $this->hasMany(StockMovement::class);
    }

    /** Harga per unit (Rp/ml, Rp/gram, Rp/pcs), 2 desimal. */
    public function costPerUnit(): float
    {
        return $this->pack_size > 0 ? round($this->pack_price / $this->pack_size, 2) : 0.0;
    }

    public function isLowStock(): bool
    {
        return $this->min_stock !== null && $this->stock_qty <= $this->min_stock;
    }
}
