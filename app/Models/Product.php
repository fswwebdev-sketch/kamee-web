<?php

namespace App\Models;

use App\Models\Concerns\HasSlug;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, HasSlug, SoftDeletes;

    protected $fillable = [
        'category_id', 'name', 'slug', 'short_description', 'description', 'composition',
        'calories', 'base_price', 'image', 'is_featured', 'is_best_seller', 'is_active',
    ];

    protected function casts(): array
    {
        return [
            'base_price' => 'integer',
            'calories' => 'integer',
            'rating_avg' => 'float',
            'review_count' => 'integer',
            'sold_count' => 'integer',
            'is_featured' => 'boolean',
            'is_best_seller' => 'boolean',
            'is_active' => 'boolean',
        ];
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function images(): HasMany
    {
        return $this->hasMany(ProductImage::class)->orderBy('sort_order');
    }

    public function optionGroups(): BelongsToMany
    {
        return $this->belongsToMany(OptionGroup::class, 'product_option_group')
            ->withPivot('sort_order')
            ->orderByPivot('sort_order');
    }

    public function outlets(): BelongsToMany
    {
        return $this->belongsToMany(Outlet::class)->withPivot('is_available', 'updated_at');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function scopeActive(Builder $query): void
    {
        $query->where('is_active', true);
    }

    /** Produk yang tidak ditandai habis di outlet tertentu. */
    public function scopeAvailableAt(Builder $query, int $outletId): void
    {
        $query->whereDoesntHave('outlets', fn (Builder $q) => $q
            ->where('outlets.id', $outletId)
            ->where('outlet_product.is_available', false));
    }
}
