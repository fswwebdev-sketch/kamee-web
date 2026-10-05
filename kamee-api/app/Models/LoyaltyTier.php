<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LoyaltyTier extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = ['name', 'min_spend', 'point_multiplier', 'perks'];

    protected function casts(): array
    {
        return ['min_spend' => 'integer', 'point_multiplier' => 'float', 'perks' => 'array'];
    }

    public function customers(): HasMany
    {
        return $this->hasMany(Customer::class, 'tier_id');
    }
}
