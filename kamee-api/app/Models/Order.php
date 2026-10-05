<?php

namespace App\Models;

use App\Enums\FulfillmentType;
use App\Enums\OrderChannel;
use App\Enums\OrderStatus;
use App\Enums\PaymentMethod;
use App\Models\Scopes\OutletScope;
use Illuminate\Database\Eloquent\Attributes\ScopedBy;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

#[ScopedBy(OutletScope::class)]
class Order extends Model
{
    use HasFactory;

    /** Kolom status & nominal hanya diubah lewat service, tidak lewat mass assignment. */
    protected $fillable = [
        'code', 'customer_id', 'outlet_id', 'customer_name', 'customer_phone', 'fulfillment',
        'address', 'lat', 'lng', 'scheduled_at', 'subtotal', 'discount', 'points_redeemed',
        'delivery_fee', 'service_fee', 'total', 'note', 'channel', 'handled_by',
    ];

    protected $attributes = [
        'status' => 'pending',
    ];

    protected function casts(): array
    {
        return [
            'fulfillment' => FulfillmentType::class,
            'status' => OrderStatus::class,
            'channel' => OrderChannel::class,
            'lat' => 'float',
            'lng' => 'float',
            'subtotal' => 'integer',
            'discount' => 'integer',
            'points_redeemed' => 'integer',
            'delivery_fee' => 'integer',
            'service_fee' => 'integer',
            'total' => 'integer',
            'scheduled_at' => 'datetime',
            'paid_at' => 'datetime',
            'completed_at' => 'datetime',
            'stock_deducted_at' => 'datetime',
            'stock_reversed_at' => 'datetime',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'id';
    }

    public function customer(): BelongsTo
    {
        return $this->belongsTo(Customer::class);
    }

    public function outlet(): BelongsTo
    {
        return $this->belongsTo(Outlet::class);
    }

    public function handler(): BelongsTo
    {
        return $this->belongsTo(User::class, 'handled_by');
    }

    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    public function latestPayment(): HasOne
    {
        return $this->hasOne(Payment::class)->latestOfMany();
    }

    public function statusLogs(): HasMany
    {
        return $this->hasMany(OrderStatusLog::class)->orderBy('id');
    }

    public function promotionUsages(): HasMany
    {
        return $this->hasMany(PromotionUsage::class);
    }

    public function isCash(): bool
    {
        return $this->payments()->where('method', PaymentMethod::Cash)->exists();
    }

    /** Cocokkan 4 digit terakhir nomor WA untuk pelacakan tamu. */
    public function phoneMatches(?string $lastDigits): bool
    {
        $lastDigits = preg_replace('/\D/', '', (string) $lastDigits);

        return strlen($lastDigits) >= 4 && str_ends_with($this->customer_phone, substr($lastDigits, -4));
    }
}
