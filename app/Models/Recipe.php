<?php

namespace App\Models;

use App\Models\Scopes\OutletScope;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Resep (takaran bahan) sebuah produk di satu outlet; baris per varian ukuran ada di recipe_items. */
#[ScopedBy(OutletScope::class)]
class Recipe extends Model
{
    protected $fillable = ['outlet_id', 'product_id', 'is_sample', 'note', 'updated_by'];

    protected function casts(): array
    {
        return ['is_sample' => 'boolean'];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class)->withTrashed();
    }

    public function items(): HasMany
    {
        return $this->hasMany(RecipeItem::class)->orderBy('id');
    }
}
