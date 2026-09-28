<?php

namespace App\Models;

use App\Enums\OptionGroupType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OptionGroup extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = ['name', 'type', 'is_required'];

    protected function casts(): array
    {
        return ['type' => OptionGroupType::class, 'is_required' => 'boolean'];
    }

    public function options(): HasMany
    {
        return $this->hasMany(Option::class)->orderBy('sort_order');
    }

    public function products(): BelongsToMany
    {
        return $this->belongsToMany(Product::class, 'product_option_group');
    }
}
