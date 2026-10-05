<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Banner extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = [
        'title', 'subtitle', 'image_desktop', 'image_mobile', 'link_url', 'placement',
        'sort_order', 'starts_at', 'ends_at', 'is_active',
    ];

    protected function casts(): array
    {
        return ['starts_at' => 'datetime', 'ends_at' => 'datetime', 'is_active' => 'boolean', 'sort_order' => 'integer'];
    }

    public function scopeRunning(Builder $query): void
    {
        $now = now();
        $query->where('is_active', true)
            ->where(fn ($q) => $q->whereNull('starts_at')->orWhere('starts_at', '<=', $now))
            ->where(fn ($q) => $q->whereNull('ends_at')->orWhere('ends_at', '>=', $now));
    }
}
