<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;

class Customer extends Authenticatable
{
    use HasApiTokens, HasFactory;

    protected $fillable = ['name', 'phone_wa', 'email', 'birth_date', 'tier_id', 'referral_code'];

    protected $attributes = ['points_balance' => 0, 'lifetime_spend' => 0];

    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
            'points_balance' => 'integer',
            'lifetime_spend' => 'integer',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (Customer $customer) {
            $customer->referral_code ??= static::generateReferralCode();
        });
    }

    public static function generateReferralCode(): string
    {
        do {
            $code = 'KM'.Str::upper(Str::random(6));
        } while (static::where('referral_code', $code)->exists());

        return $code;
    }

    protected function serializeDate(\DateTimeInterface $date): string
    {
        return $date->format(DATE_ATOM);
    }

    public function tier(): BelongsTo
    {
        return $this->belongsTo(LoyaltyTier::class, 'tier_id');
    }

    public function addresses(): HasMany
    {
        return $this->hasMany(CustomerAddress::class);
    }

    public function orders(): HasMany
    {
        return $this->hasMany(Order::class);
    }

    public function loyaltyTransactions(): HasMany
    {
        return $this->hasMany(LoyaltyTransaction::class);
    }

    public function favorites(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'favorites');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }
}
