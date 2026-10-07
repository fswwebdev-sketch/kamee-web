<?php

namespace App\Models;

use App\Models\Concerns\HasSlug;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

class Outlet extends Model
{
    use HasFactory, HasSlug;

    protected $fillable = [
        'name', 'slug', 'address', 'city', 'lat', 'lng', 'phone_wa',
        'open_time', 'close_time', 'is_open', 'delivery_radius_km',
    ];

    protected function casts(): array
    {
        return [
            'lat' => 'float',
            'lng' => 'float',
            'is_open' => 'boolean',
            'delivery_radius_km' => 'float',
        ];
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class)->withPivot('is_available', 'updated_at');
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function admins(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function scopeOpen(Builder $query): void
    {
        $query->where('is_open', true);
    }

    /** Outlet menerima pesanan: status buka dan berada dalam jam operasional. */
    public function isAcceptingOrders(?Carbon $at = null): bool
    {
        if (! $this->is_open) {
            return false;
        }

        $at ??= now();
        if (in_array($at->copy()->setTimezone(config('app.timezone'))->dayOfWeek, config('kamee.closed_days', []), true)) {
            return false; // hari libur mingguan (default: Minggu)
        }

        $time = $at->format('H:i:s');
        $open = Carbon::parse($this->open_time)->format('H:i:s');
        $close = Carbon::parse($this->close_time)->format('H:i:s');

        return $open <= $close
            ? $time >= $open && $time <= $close
            : $time >= $open || $time <= $close; // jam operasional melewati tengah malam
    }

    public function isProductAvailable(int $productId): bool
    {
        $pivot = $this->products()->where('products.id', $productId)->first()?->pivot;

        return $pivot === null || (bool) $pivot->is_available;
    }
}
