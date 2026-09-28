<?php

namespace App\Models;

use App\Models\Concerns\HasSlug;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BlogCategory extends Model
{
    use HasFactory, HasSlug;

    public $timestamps = false;

    protected $fillable = ['name', 'slug'];

    public function blogs(): HasMany
    {
        return $this->hasMany(Blog::class);
    }
}
