<?php

namespace App\Models;

use App\Enums\PaymentMethod;
use App\Enums\PaymentStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id', 'method', 'provider', 'provider_ref', 'amount', 'status',
        'qr_string', 'va_number', 'expires_at', 'paid_at', 'raw_payload',
    ];

    protected function casts(): array
    {
        return [
            'method' => PaymentMethod::class,
            'status' => PaymentStatus::class,
            'amount' => 'integer',
            'expires_at' => 'datetime',
            'paid_at' => 'datetime',
            'raw_payload' => 'array',
        ];
    }

    public function order(): BelongsTo
    {
        return $this->belongsTo(Order::class)->withoutGlobalScopes();
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    public function deeplink(): ?string
    {
        return $this->raw_payload['deeplink'] ?? null;
    }
}
