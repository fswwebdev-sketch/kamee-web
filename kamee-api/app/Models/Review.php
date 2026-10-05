<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Review extends Model
{
    use HasFactory;

    protected $fillable = ['product_id', 'customer_id', 'order_id', 'rating', 'comment', 'photo', 'is_published', 'reply'];

    protected function casts(): array
    {
        return ['rating' => 'integer', 'is_published' => 'boolean'];
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class)->withTrashed();
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class)->withoutGlobalScopes();
    }

    public function scopePublished(Builder $query): void
    {
        $query->where('is_published', true);
    }
}
