<?php

namespace App\Http\Resources;

use App\Models\Blog;
use App\Support\Media;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin Blog */
class BlogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'slug' => $this->slug,
            'excerpt' => $this->excerpt,
            'cover_url' => Media::url($this->cover),
            'category' => new BlogCategoryResource($this->whenLoaded('category')),
            'author' => $this->whenLoaded('author', fn () => $this->author?->name),
            'status' => $this->status->value,
            'published_at' => $this->published_at?->toIso8601String(),
            'views' => $this->views,
            'content' => $this->when($request->routeIs('*.blogs.show'), $this->content),
            'meta_title' => $this->when($request->routeIs('*.blogs.show'), $this->meta_title ?? $this->title),
            'meta_description' => $this->when($request->routeIs('*.blogs.show'), $this->meta_description ?? $this->excerpt),
        ];
    }
}
