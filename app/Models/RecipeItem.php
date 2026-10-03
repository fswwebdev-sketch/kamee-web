<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RecipeItem extends Model
{
    public $timestamps = false;

    protected $fillable = ['recipe_id', 'option_name', 'ingredient_id', 'qty'];

    protected function casts(): array
    {
        return ['qty' => 'float'];
    }

    public function recipe(): BelongsTo
    {
        return $this->belongsTo(Recipe::class);
    }

    public function ingredient(): BelongsTo
    {
        return $this->belongsTo(Ingredient::class);
    }
}
