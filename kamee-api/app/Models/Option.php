<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Option extends Model
{
    use HasFactory;

    public $timestamps = false;

    protected $fillable = ['option_group_id', 'name', 'price_delta', 'sort_order'];

    protected function casts(): array
    {
        return ['price_delta' => 'integer'];
    }

    public function group(): BelongsTo
    {
        return $this->belongsTo(OptionGroup::class, 'option_group_id');
    }
}
