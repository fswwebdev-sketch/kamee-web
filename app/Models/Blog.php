<?php

namespace App\Models;

use App\Enums\BlogStatus;
use App\Models\Concerns\HasSlug;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Blog extends Model
{
    use HasFactory, HasSlug;

    protected $fillable = [
        'blog_category_id', 'author_id', 'title', 'slug', 'excerpt', 'content', 'cover',
        'meta_title', 'meta_description', 'status', 'published_at',
    ];

    protected function casts(): array
    {
        return ['status' => BlogStatus::class, 'published_at' => 'datetime', 'views' => 'integer'];
    }

    protected function slugSource(): string
    {
        return 'title';
    }

    public function category(): BelongsTo
    {
        return $this->belongsTo(BlogCategory::class, 'blog_category_id');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function scopePublished(Builder $query): void
    {
        $query->where('status', BlogStatus::Published)->where('published_at', '<=', now());
    }
}
